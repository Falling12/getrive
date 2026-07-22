import { prisma } from "@/lib/prisma";
import { fetchRedditSearchMatches } from "@/lib/reddit/search-reddit";
import { searchStackExchangeSite } from "@/lib/stackexchange/search-stackexchange";
import { searchHackerNews } from "@/lib/hackernews/search-hackernews";
import { SE_QUOTA_LOW_THRESHOLD } from "@/lib/limits";
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

// Shared across every Stack Exchange query in one runBackfillSearchForProduct
// call so the first query to observe an exhausted/low quota stops the rest of
// that product's SE batch from independently making requests only to also
// find it exhausted — and so the low-quota warning below fires once per run,
// not once per query.
interface SeQuotaState {
  exhausted: boolean;
  warnedLow: boolean;
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
// it is a no-op, not a duplicate row or an error. Returns how many matches
// were genuinely new (not already-seen re-finds) — AGENTS.md Phase 2C's
// query feedback loop tracks SearchQuery.matchCount as a lifetime total of
// real new finds, not a raw per-run result count, so a query that keeps
// re-finding the same handful of old posts every run doesn't look like it's
// still producing fresh value.
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
}): Promise<number> {
  const existingIds = new Set(
    (
      await prisma.searchResult.findMany({
        where: {
          productId,
          platform,
          venue: { in: [...new Set(matches.map((m) => m.venue))] },
          externalId: { in: matches.map((m) => m.externalId) },
        },
        select: { venue: true, externalId: true },
      })
    ).map((r) => `${r.venue}::${r.externalId}`)
  );

  let newCount = 0;
  for (const match of matches) {
    if (!existingIds.has(`${match.venue}::${match.externalId}`)) newCount += 1;
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
  return newCount;
}

// Success resets consecutiveFailures and stamps lastSuccessfulRunAt
// separately from lastRunAt (bumped here too, but also on failure below) —
// mirrors Source's lastPolledAt/lastSuccessfulPollAt/consecutiveFailures
// split, so a chronically-failing query's staleness is visible even though
// lastRunAt itself keeps advancing on every attempt.
async function recordQuerySuccess(queryId: string, newMatches: number): Promise<void> {
  await prisma.searchQuery.update({
    where: { id: queryId },
    data: {
      matchCount: { increment: newMatches },
      lastRunAt: new Date(),
      lastSuccessfulRunAt: new Date(),
      consecutiveFailures: 0,
    },
  });
}

// Own try/catch: a failure to record a failure shouldn't throw past the
// caller's outer catch and get double-logged/swallowed.
async function recordQueryFailure(queryId: string): Promise<void> {
  try {
    await prisma.searchQuery.update({
      where: { id: queryId },
      data: { lastRunAt: new Date(), consecutiveFailures: { increment: 1 } },
    });
  } catch (error) {
    console.error(`[backfill-search] failed to record failure for query ${queryId}`, error);
  }
}

async function runRedditQuery(
  productId: string,
  query: { id: string; text: string; lastRunAt: Date | null },
  windowFloor: Date,
  summary: BackfillSummary
): Promise<void> {
  try {
    await waitForRedditSearchSlot();
    // First-ever run for this query searches the full BACKFILL_WINDOW_DAYS
    // floor (the base-rate volume count depends on that initial sweep);
    // every run after that only needs to search since the query's own last
    // run, not re-fight the whole trailing window against Reddit's
    // relevance-ranked, 100-result-capped search every time.
    const effectiveSince = query.lastRunAt ?? windowFloor;
    // A single retry on 429: the ~60s interval above is Reddit's
    // documented steady-state limit, but a burst of other traffic
    // against this IP (or a prior run finishing recently) can still
    // trip the throttle once — one extra wait-and-retry recovers most
    // of those without failing the whole query outright.
    let matches;
    try {
      matches = await fetchRedditSearchMatches(query.text, effectiveSince);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("429")) throw error;
      await sleep(REDDIT_SEARCH_INTERVAL_MS * 2);
      lastRedditSearchAt = Date.now();
      matches = await fetchRedditSearchMatches(query.text, effectiveSince);
    }
    const newCount = await storeMatches({
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
    await recordQuerySuccess(query.id, newCount);
    summary.queriesRun += 1;
  } catch (error) {
    summary.errors.push({
      query: query.text,
      platform: "REDDIT",
      message: error instanceof Error ? error.message : String(error),
    });
    await recordQueryFailure(query.id);
  }
}

async function runStackExchangeQuery(
  productId: string,
  query: { id: string; text: string; variantType: string; lastRunAt: Date | null },
  seSites: string[],
  windowFloor: Date,
  summary: BackfillSummary,
  quotaState: SeQuotaState
): Promise<void> {
  try {
    const isTag = query.variantType === "PLATFORM_IDIOMATIC";
    // See runRedditQuery's effectiveSince comment — same reasoning applies
    // here, independent of Reddit's specific relevance-ranking problem,
    // since Stack Exchange's fromdate is a real server-side filter and a
    // narrower window is strictly less wasted request volume either way.
    const effectiveSince = query.lastRunAt ?? windowFloor;
    let totalMatches = 0;
    let newMatches = 0;
    for (const site of seSites) {
      const { matches, quotaRemaining } = await searchStackExchangeSite({
        site,
        text: isTag ? undefined : query.text,
        tag: isTag ? query.text : undefined,
        sinceDate: effectiveSince,
      });
      totalMatches += matches.length;
      newMatches += await storeMatches({
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

      if (typeof quotaRemaining === "number") {
        if (quotaRemaining <= 0) {
          if (!quotaState.exhausted) {
            console.warn(
              `[backfill-search] Stack Exchange quota exhausted (site "${site}") — stopping remaining Stack Exchange queries this run`
            );
          }
          quotaState.exhausted = true;
          break;
        }
        if (quotaRemaining <= SE_QUOTA_LOW_THRESHOLD && !quotaState.warnedLow) {
          console.warn(`[backfill-search] Stack Exchange quota running low: ${quotaRemaining} requests remaining`);
          quotaState.warnedLow = true;
        }
      }
    }
    summary.matchesStored += totalMatches;
    await recordQuerySuccess(query.id, newMatches);
    summary.queriesRun += 1;
  } catch (error) {
    summary.errors.push({
      query: query.text,
      platform: "STACKEXCHANGE",
      message: error instanceof Error ? error.message : String(error),
    });
    await recordQueryFailure(query.id);
  }
}

async function runHackerNewsQuery(
  productId: string,
  query: { id: string; text: string; lastRunAt: Date | null },
  windowFloor: Date,
  summary: BackfillSummary
): Promise<void> {
  try {
    // See runRedditQuery's effectiveSince comment. No per-IP throttle here
    // (unlike Reddit) — HN's Algolia search API has no documented
    // rate-limit-by-IP concern, so queries just run one after another with
    // no spacing.
    const effectiveSince = query.lastRunAt ?? windowFloor;
    const { matches } = await searchHackerNews({ text: query.text, sinceDate: effectiveSince });
    const newCount = await storeMatches({
      productId,
      queryId: query.id,
      platform: "HACKERNEWS",
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
    await recordQuerySuccess(query.id, newCount);
    summary.queriesRun += 1;
  } catch (error) {
    summary.errors.push({
      query: query.text,
      platform: "HACKERNEWS",
      message: error instanceof Error ? error.message : String(error),
    });
    await recordQueryFailure(query.id);
  }
}

// Runs every ACTIVE SearchQuery for one product. Callers spanning multiple
// products (e.g. scripts/run-phase1-diagnostic.ts) should call this
// sequentially per product, not in parallel — the Reddit spacing above is
// per-process, not per-product, and concurrent calls would silently race
// past Reddit's real per-IP throttle.
//
// Reddit queries run one at a time, spaced by the real per-IP throttle;
// Stack Exchange queries have no comparable global limit, so they run as
// their own sequential chain concurrently with the Reddit chain instead of
// queuing behind every Reddit wait — total wall time is roughly
// max(redditChainTime, seChainTime) instead of their sum.
// options.deadline is an absolute Date.now()-comparable timestamp past
// which no *new* query is started (a query already in flight, including
// its own throttle wait, still runs to completion). Without this, a
// product with many ACTIVE Reddit queries can blow well past the caller's
// own time budget on its own — see measurement-run.service.ts, whose
// maxDuration=300s route this feeds — and since Reddit queries run
// strictly sequentially (the throttle above is global), the run has no
// other way to bound its own wall time. Left unbounded (the default) for
// scripts/run-phase1-diagnostic.ts, which isn't running inside a
// time-limited request.
export async function runBackfillSearchForProduct(
  productId: string,
  options?: { deadline?: number }
): Promise<BackfillSummary> {
  const deadline = options?.deadline ?? Infinity;
  // The floor for a query's first-ever run only — runRedditQuery/
  // runStackExchangeQuery use this just when a query's own lastRunAt is
  // null; every subsequent run searches since that query's lastRunAt
  // instead, not this shared 90-day window.
  const windowFloor = new Date(Date.now() - BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  // Stalest-lastRunAt-first (nulls — never run — first): the same
  // "resume where it left off" ordering measurement-run.service.ts already
  // applies across products, applied here across one product's own
  // queries so a deadline cutting a run short still rotates coverage
  // across the full query set over successive runs instead of always
  // starving whichever queries sort last.
  const queries = await prisma.searchQuery.findMany({
    where: { productId, status: "ACTIVE" },
    orderBy: { lastRunAt: { sort: "asc", nulls: "first" } },
  });

  const summary: BackfillSummary = { productId, queriesRun: 0, matchesStored: 0, errors: [] };
  const seSites = await stackExchangeSitesForProduct(productId);
  const seQuotaState: SeQuotaState = { exhausted: false, warnedLow: false };

  const redditQueries = queries.filter((q) => q.platform === "REDDIT");
  const seQueries = queries.filter((q) => q.platform === "STACKEXCHANGE");
  const hackerNewsQueries = queries.filter((q) => q.platform === "HACKERNEWS");

  await Promise.all([
    (async () => {
      for (const query of redditQueries) {
        if (Date.now() >= deadline) break;
        await runRedditQuery(productId, query, windowFloor, summary);
      }
    })(),
    (async () => {
      for (const query of seQueries) {
        if (Date.now() >= deadline || seQuotaState.exhausted) break;
        await runStackExchangeQuery(productId, query, seSites, windowFloor, summary, seQuotaState);
      }
    })(),
    (async () => {
      for (const query of hackerNewsQueries) {
        if (Date.now() >= deadline) break;
        await runHackerNewsQuery(productId, query, windowFloor, summary);
      }
    })(),
  ]);

  return summary;
}
