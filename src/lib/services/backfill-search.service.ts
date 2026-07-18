import { prisma } from "@/lib/prisma";
import { fetchRedditSearchMatches } from "@/lib/reddit/search-reddit";
import { searchStackExchangeSite } from "@/lib/stackexchange/search-stackexchange";
import type { SearchPlatform } from "@/generated/prisma/client";

// AGENTS.md Phase 1B — read-only backfill search. Runs every ACTIVE
// SearchQuery for a product against its platform's real search endpoint and
// stores every match as a SearchResult row. Deliberately never calls Signal
// Scoring and never creates a Signal — this phase only measures how often a
// product's pain point is actually mentioned, feeding the base-rate
// classification (1C), not the signal feed.
export const BACKFILL_WINDOW_DAYS = 90;

// Reddit's unauthenticated search.rss shares the same ~1 request/60s global
// per-IP throttle as the subreddit-polling RSS feeds (see fetch-posts.ts) —
// spaced explicitly here since a backfill run fires many distinct search
// requests in sequence, unlike poll.ts's one-combined-request-per-run shape.
const REDDIT_SEARCH_INTERVAL_MS = 75_000;

// Stack Exchange site(s) to search when a product has no STACKEXCHANGE
// source of its own yet. softwarerecs is the general-purpose "which tool/app
// should I use for X" venue (see source-discovery.ts's reasoning for it) —
// a reasonable default until Phase 3A's dedicated SE site-selection exists
// to pick something more targeted.
const DEFAULT_STACKEXCHANGE_SITE = "softwarerecs";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Module-level, not per-call/per-product: Reddit's ~1 req/60s throttle is
// global per IP, so a diagnostic run across many products (each calling
// runBackfillSearchForProduct in turn) must still space every Reddit search
// request in the whole process by this interval — resetting the clock per
// product would let product N+1's first request fire immediately after
// product N's last one.
let lastRedditSearchAt = 0;
async function waitForRedditSearchSlot(): Promise<void> {
  const elapsed = Date.now() - lastRedditSearchAt;
  if (lastRedditSearchAt > 0 && elapsed < REDDIT_SEARCH_INTERVAL_MS) {
    await sleep(REDDIT_SEARCH_INTERVAL_MS - elapsed);
  }
  lastRedditSearchAt = Date.now();
}

export interface BackfillSummary {
  productId: string;
  queriesRun: number;
  matchesStored: number;
  errors: { query: string; platform: SearchPlatform; message: string }[];
}

interface NormalizedMatch {
  externalId: string;
  title: string;
  body: string;
  permalink: string;
  author: string;
  postedAt: Date;
  venue: string;
  answerCount?: number;
  hasAcceptedAnswer?: boolean;
  threadState?: string;
}

async function stackExchangeSitesForProduct(productId: string): Promise<string[]> {
  const sources = await prisma.source.findMany({
    where: { productId, type: "STACKEXCHANGE" },
    select: { name: true },
  });
  const sites = [...new Set(sources.map((s) => s.name.toLowerCase()))];
  return sites.length > 0 ? sites : [DEFAULT_STACKEXCHANGE_SITE];
}

// Upserted per (productId, platform, venue, externalId) — the same post can
// legitimately be found by more than one query (different phrasings hitting
// the same thread), and the unique constraint means a later query re-finding
// it is a no-op, not a duplicate row or an error.
async function storeMatches({
  productId,
  queryId,
  platform,
  matches,
}: {
  productId: string;
  queryId: string;
  platform: SearchPlatform;
  matches: NormalizedMatch[];
}): Promise<void> {
  for (const match of matches) {
    await prisma.searchResult.upsert({
      where: {
        productId_platform_venue_externalId: {
          productId,
          platform,
          venue: match.venue,
          externalId: match.externalId,
        },
      },
      create: {
        productId,
        queryId,
        platform,
        venue: match.venue,
        externalId: match.externalId,
        title: match.title,
        body: match.body,
        permalink: match.permalink,
        author: match.author,
        postedAt: match.postedAt,
        answerCount: match.answerCount ?? null,
        hasAcceptedAnswer: match.hasAcceptedAnswer ?? null,
        threadState: match.threadState ?? null,
      },
      update: {},
    });
  }
}

// Runs every ACTIVE SearchQuery for one product. Callers spanning multiple
// products (e.g. scripts/run-phase1-diagnostic.ts) should call this
// sequentially per product, not in parallel — the Reddit spacing above is
// per-process, not per-product, and concurrent calls would silently race
// past Reddit's real per-IP throttle.
export async function runBackfillSearchForProduct(productId: string): Promise<BackfillSummary> {
  const sinceDate = new Date(Date.now() - BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const queries = await prisma.searchQuery.findMany({
    where: { productId, status: "ACTIVE" },
  });

  const summary: BackfillSummary = { productId, queriesRun: 0, matchesStored: 0, errors: [] };
  const seSites = await stackExchangeSitesForProduct(productId);

  for (const query of queries) {
    try {
      if (query.platform === "REDDIT") {
        await waitForRedditSearchSlot();
        // A single retry on 429: the ~60s interval above is Reddit's
        // documented steady-state limit, but a burst of other traffic
        // against this IP (or a prior run finishing recently) can still
        // trip the throttle once — one extra wait-and-retry recovers most
        // of those without failing the whole query outright.
        let matches;
        try {
          matches = await fetchRedditSearchMatches(query.text, sinceDate);
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("429")) throw error;
          await sleep(REDDIT_SEARCH_INTERVAL_MS * 2);
          lastRedditSearchAt = Date.now();
          matches = await fetchRedditSearchMatches(query.text, sinceDate);
        }
        await storeMatches({
          productId,
          queryId: query.id,
          platform: "REDDIT",
          matches: matches.map((m) => ({
            externalId: m.id,
            title: m.title,
            body: m.selftext,
            permalink: m.permalink,
            author: m.author,
            postedAt: m.createdAt,
            venue: m.venue,
          })),
        });
        summary.matchesStored += matches.length;
        await prisma.searchQuery.update({
          where: { id: query.id },
          data: { matchCount: matches.length, lastRunAt: new Date() },
        });
      } else {
        const isTag = query.variantType === "PLATFORM_IDIOMATIC";
        let totalMatches = 0;
        for (const site of seSites) {
          const { matches } = await searchStackExchangeSite({
            site,
            text: isTag ? undefined : query.text,
            tag: isTag ? query.text : undefined,
            sinceDate,
          });
          totalMatches += matches.length;
          await storeMatches({
            productId,
            queryId: query.id,
            platform: "STACKEXCHANGE",
            matches: matches.map((m) => ({
              externalId: m.id,
              title: m.title,
              body: m.selftext,
              permalink: m.permalink,
              author: m.author,
              postedAt: m.createdAt,
              venue: m.venue,
              answerCount: m.answerCount,
              hasAcceptedAnswer: m.hasAcceptedAnswer,
              threadState: m.threadState,
            })),
          });
        }
        summary.matchesStored += totalMatches;
        await prisma.searchQuery.update({
          where: { id: query.id },
          data: { matchCount: totalMatches, lastRunAt: new Date() },
        });
      }
      summary.queriesRun += 1;
    } catch (error) {
      summary.errors.push({
        query: query.text,
        platform: query.platform,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}
