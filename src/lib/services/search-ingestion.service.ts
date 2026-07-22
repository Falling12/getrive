import { prisma } from "@/lib/prisma";
import { MAX_POSTS_PER_SCORING_BATCH } from "@/lib/ai/signal-scoring";
import {
  recordQueryOutcome,
  proposeQueryFromPassingMatch,
  retireUnderperformingQueries,
} from "@/lib/services/query-feedback.service";
import {
  scoreBatchAndCreateSignals,
  flushPendingFirstSignalEmails,
  type PendingFirstSignalBucket,
  type ScoringProduct,
} from "@/lib/services/scoring-pipeline.service";
import { DAILY_SCORING_CAP_PER_PROJECT, DAILY_SCORING_CAP_PER_ACCOUNT, isExemptFromLimits } from "@/lib/limits";
import type { SearchPlatform, SearchResult, SourceType } from "@/generated/prisma/client";

// Feeds a Phase-1-backfilled SearchResult row through the same Signal
// Scoring gate lib/reddit/poll.ts uses for polled posts (both now share
// scoring-pipeline.service.ts's scoreBatchAndCreateSignals), so a sitewide
// search match becomes a real Signal exactly like a post found by polling
// a monitored community. This only scores matches already sitting in
// SearchResult (from a backfill or a later re-run of it) — it does not
// itself go fetch new matches; call
// lib/services/backfill-search.service.ts's runBackfillSearchForProduct
// first if the caller wants this pass to see anything newer than the last
// backfill.
//
// A SearchResult isn't tied to a founder-selected Source — it's a sitewide
// match, not a post from a community the founder chose to monitor — but
// ScoredPost's dedup key and Signal.sourceId are both a required FK built
// around "one source, many posts". Rather than a schema change,
// findOrCreateSourceForVenue below gives every distinct (platform, venue) a
// Source row with `selected: false`, so it never shows as "on" in the
// Sources page, purely so the existing dedup/Signal machinery keeps working
// unmodified. Venue-mining can later flip `selected: true` on that same row
// once a founder accepts it as a real source to monitor.
const SEARCH_DISCOVERED_SOURCE_REASONING =
  "Discovered via search-mode ingestion — not yet reviewed or selected by the founder.";
// Sorts after every LLM-ranked source-discovery recommendation (those start
// at rank 1) in any rank-ordered list, without needing to look up the
// current max rank for the product first.
const SEARCH_DISCOVERED_SOURCE_RANK = 9999;

// Stack Exchange's own fields tell us directly whether a thread is still
// worth replying to; a question that already has an accepted answer, or
// was closed, has already been "resolved" from the original poster's point
// of view, so a reply there reaches nobody with a live problem even if the
// content is a perfect topical match.
const RESOLVED_SE_THREAD_STATES = new Set(["closed"]);

// Reddit and Hacker News have no closed/resolved concept the way Stack
// Exchange does, so their bucketing rule is age-based instead: a months-old
// thread is unlikely to still be checked by its author, so replying is low
// value even for a strong topical match. A judgment call, not a platform
// constraint — revisit if this turns out to filter out real value. Applied
// to both platforms with the same threshold for now — HN threads arguably
// go stale even faster than Reddit's given the front page's faster
// turnover, but there's no evidence yet to justify a tighter number.
const MAX_REDDIT_MATCH_AGE_DAYS = 30;

// Exported for the Signals page's "historical mentions" section — an
// ineligible SearchResult is never scored, but is still real evidence the
// pain point gets mentioned, just too old/resolved to be a live reply
// target. Applied at read time (not persisted as a bucket on the row)
// since Reddit's age window is relative to "now", not to when the match
// was found — a 25-day-old match at ingestion time is 31 days old, and
// therefore historical, a week later without anything about the row itself
// changing.
export function isEligibleForScoring(result: SearchResult): boolean {
  if (result.platform === "STACKEXCHANGE") {
    if (result.hasAcceptedAnswer) return false;
    if (result.threadState && RESOLVED_SE_THREAD_STATES.has(result.threadState)) return false;
    return true;
  }
  const ageDays = (Date.now() - result.postedAt.getTime()) / (24 * 60 * 60 * 1000);
  return ageDays <= MAX_REDDIT_MATCH_AGE_DAYS;
}

function sourceTypeForPlatform(platform: SearchPlatform): SourceType {
  switch (platform) {
    case "REDDIT":
      return "REDDIT_SUBREDDIT";
    case "STACKEXCHANGE":
      return "STACKEXCHANGE";
    case "HACKERNEWS":
      return "HACKERNEWS";
  }
}

async function findOrCreateSourceForVenue(
  productId: string,
  platform: SearchPlatform,
  venue: string
): Promise<{ id: string; type: SourceType; name: string }> {
  return prisma.source.upsert({
    where: { productId_name: { productId, name: venue } },
    create: {
      productId,
      type: sourceTypeForPlatform(platform),
      name: venue,
      reasoning: SEARCH_DISCOVERED_SOURCE_REASONING,
      rank: SEARCH_DISCOVERED_SOURCE_RANK,
      selected: false,
      discoveredViaSearch: true,
    },
    update: {},
    select: { id: true, type: true, name: true },
  });
}

export interface SearchIngestionSummary {
  productId: string;
  venuesProcessed: number;
  matchesEligible: number;
  matchesSkippedResolved: number;
  matchesScored: number;
  signalsCreated: number;
  queriesRetired: number;
  errors: number;
}

// Unlike Reddit search (lib/reddit/search-reddit.ts), there's no per-IP
// throttle gating Signal Scoring calls — the AI provider's own concurrent-
// request limit is much higher than "1 per 75s". Running every venue's
// scoring batches strictly one-at-a-time (confirmed empirically: a run
// against ~365 matches across 20+ venues was still stuck on the first
// product after 2+ minutes) was leaving that headroom on the table for no
// real reason. Batches now run with this much concurrency instead of a
// single sequential chain.
const CONCURRENT_SCORING_BATCHES = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (let i = next++; i < items.length; i = next++) {
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

interface ScoringBatchJob {
  source: { id: string; type: SourceType; name: string };
  batch: SearchResult[];
}

// Mirrors lib/reddit/poll.ts's per-source scoring loop, applied to
// SearchResult rows grouped by (platform, venue) instead of RawSourcePost
// rows grouped by Source — both now delegate the actual "score, write
// ScoredPost + Signal, notify" sequence to scoring-pipeline.service.ts's
// scoreBatchAndCreateSignals, which also handles the first-signal welcome
// email identically to poll.ts. What stays here is what's genuinely
// specific to search-mode ingestion: feeding scored/passed outcomes back
// into query-feedback.service.ts.
async function runScoringBatch(
  job: ScoringBatchJob,
  product: ScoringProduct,
  pendingFirstSignalEmails: Map<string, PendingFirstSignalBucket>
) {
  const { source, batch } = job;

  return scoreBatchAndCreateSignals(
    source,
    product,
    batch.map((match) => ({
      externalId: match.externalId,
      title: match.title,
      body: match.body,
      permalink: match.permalink,
      author: match.author,
      postedAt: match.postedAt,
    })),
    pendingFirstSignalEmails,
    {
      onScored: (index, relevanceScore, passed) => recordQueryOutcome(batch[index].queryId, relevanceScore, passed),
      onSignalCreated: async (index) => {
        const match = batch[index];
        await proposeQueryFromPassingMatch({
          productId: product.id,
          userId: product.user.id,
          userEmail: product.user.email,
          platform: match.platform,
          title: match.title,
        });
      },
    }
  );
}

// Respects the same daily scoring caps (shared cost control across every
// ingestion path, not just polling) and the same ScoredPost dedup
// discipline, so a SearchResult already scored by an earlier ingestion
// pass — or already seen via polling that same venue directly — is never
// sent to the AI twice. Scoring batches across venues run with bounded
// concurrency (see CONCURRENT_SCORING_BATCHES) rather than one long
// sequential chain, since nothing here shares Reddit search's per-IP
// throttle.
export async function runSearchIngestionForProduct(productId: string): Promise<SearchIngestionSummary> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { user: true, positioning: true },
  });

  const summary: SearchIngestionSummary = {
    productId,
    venuesProcessed: 0,
    matchesEligible: 0,
    matchesSkippedResolved: 0,
    matchesScored: 0,
    signalsCreated: 0,
    queriesRetired: 0,
    errors: 0,
  };

  const allResults = await prisma.searchResult.findMany({ where: { productId } });
  const eligible: SearchResult[] = [];
  for (const result of allResults) {
    if (isEligibleForScoring(result)) {
      eligible.push(result);
    } else {
      summary.matchesSkippedResolved += 1;
    }
  }
  summary.matchesEligible = eligible.length;

  const byVenue = new Map<string, SearchResult[]>();
  for (const result of eligible) {
    const key = `${result.platform}::${result.venue}`;
    const group = byVenue.get(key);
    if (group) group.push(result);
    else byVenue.set(key, [result]);
  }

  const exempt = isExemptFromLimits(product.user.email);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const scoredTodayProject = exempt
    ? 0
    : await prisma.scoredPost.count({ where: { source: { productId }, scoredAt: { gte: todayStart } } });
  const scoredTodayAccount = exempt
    ? 0
    : await prisma.scoredPost.count({
        where: { source: { product: { userId: product.userId } }, scoredAt: { gte: todayStart } },
      });

  const projectHeadroom = exempt ? Infinity : DAILY_SCORING_CAP_PER_PROJECT - scoredTodayProject;
  const accountHeadroom = exempt ? Infinity : DAILY_SCORING_CAP_PER_ACCOUNT - scoredTodayAccount;
  let remainingHeadroom = Math.min(projectHeadroom, accountHeadroom);

  // Set up every venue (find-or-create its Source, work out what's still
  // unscored) up front, then flatten into a single job list so the
  // concurrency limiter can pull from every venue at once instead of
  // draining one venue before starting the next.
  const jobs: ScoringBatchJob[] = [];
  for (const [, results] of byVenue) {
    if (remainingHeadroom <= 0) break;

    const first = results[0];
    const source = await findOrCreateSourceForVenue(productId, first.platform, first.venue);
    summary.venuesProcessed += 1;

    const alreadyScoredIds = new Set(
      (
        await prisma.scoredPost.findMany({
          where: { sourceId: source.id, externalId: { in: results.map((r) => r.externalId) } },
          select: { externalId: true },
        })
      ).map((row) => row.externalId)
    );
    const unscored = results.filter((r) => !alreadyScoredIds.has(r.externalId));

    for (let i = 0; i < unscored.length && remainingHeadroom > 0; ) {
      const batchSize = Math.max(1, Math.min(MAX_POSTS_PER_SCORING_BATCH, remainingHeadroom, unscored.length - i));
      jobs.push({ source, batch: unscored.slice(i, i + batchSize) });
      i += batchSize;
      remainingHeadroom -= batchSize;
    }
  }

  const pendingFirstSignalEmails = new Map<string, PendingFirstSignalBucket>();
  const results = await mapWithConcurrency(jobs, CONCURRENT_SCORING_BATCHES, (job) =>
    runScoringBatch(job, product, pendingFirstSignalEmails)
  );
  for (const r of results) {
    summary.matchesScored += r.scored;
    summary.signalsCreated += r.signalsCreated;
    summary.errors += r.errors;
  }
  await flushPendingFirstSignalEmails(pendingFirstSignalEmails);

  // Runs once per product per ingestion pass, after every query's stats for
  // this run have landed — a query only just crossing the retirement
  // threshold this run should be caught immediately, not left to wait for
  // the next pass.
  summary.queriesRetired = await retireUnderperformingQueries(productId, product.user.id);

  return summary;
}
