import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { fetchNewPostsForSubreddits, MAX_SUBREDDITS_PER_BATCH } from "@/lib/reddit/fetch-posts";
import { fetchNewHackerNewsStories } from "@/lib/hackernews/fetch-hackernews";
import { fetchNewIndieHackersPosts } from "@/lib/indiehackers/fetch-indiehackers";
import { fetchNewQuestionsForSites } from "@/lib/stackexchange/fetch-stackexchange";
import { fetchNewAskMetaFilterPosts } from "@/lib/askmetafilter/fetch-askmetafilter";
import { MAX_POSTS_PER_SCORING_BATCH } from "@/lib/ai/signal-scoring";
import {
  DAILY_SCORING_CAP_PER_PROJECT,
  DAILY_SCORING_CAP_PER_ACCOUNT,
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD,
  isExemptFromLimits,
} from "@/lib/limits";
import {
  scoreBatchAndCreateSignals,
  flushPendingFirstSignalEmails,
  type PendingFirstSignalBucket,
} from "@/lib/services/scoring-pipeline.service";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { formatSourceLabel } from "@/lib/sources/format";
import type { Source, Product, User, Positioning, SourceType } from "@/generated/prisma/client";

// This file lives under lib/reddit/ from when Getrive only ingested Reddit;
// it's now the shared multi-source polling engine (Reddit + Hacker News).
// Left at this path to avoid an import-path rename across every consumer
// for what's otherwise a naming-only concern.

export interface PollSummary {
  sourcesPolled: number;
  postsFetched: number;
  postsScored: number;
  signalsCreated: number;
  errors: number;
}

export type PollProgressEvent =
  | { type: "source-start"; name: string; index: number; total: number }
  | { type: "source-fetched"; name: string; postCount: number }
  | { type: "source-error"; name: string; message: string }
  | { type: "post-scored"; sourceName: string; title: string; score: number; passed: boolean }
  | { type: "signal-created"; sourceName: string; title: string }
  | { type: "daily-cap-reached"; sourceName: string }
  | { type: "ingestion-failing"; sourceName: string; consecutiveFailures: number }
  | { type: "ingestion-empty"; sourceName: string; consecutiveEmptyPolls: number };

// A manual poll can legitimately run long (many sources, plus scoring time
// per post). Product.activePollStartedAt is treated as stale past this, so
// a crashed run can't leave the button permanently disabled.
export const POLL_STALE_MINUTES = 20;

// Hacker News, IndieHackers, and Ask MetaFilter sources cost one shared,
// cached fetch (see caches.hn/caches.ih/caches.amf below) plus per-post
// Signal Scoring, already bounded by the daily scoring caps in
// lib/limits.ts — there's no external rate limit on any of the three, so a
// run sweeps every due source of these types rather than throttling to a
// handful per run.
const MAX_NON_REDDIT_SOURCES_PER_RUN = 100;
// Reddit sources get their own chunked, rate-limit-spaced pass (see
// pollRedditSources below) rather than a single combined request — a flat
// per-run cap equal to one request's batch size meant a project's
// subreddits only got their turn once every N runs as the platform grew
// past a few dozen projects, and an infrequent external scheduler (this
// product has no cron of its own — see the cron route's own comment) made
// that far worse: a run that only ever touches 40 Reddit sources, running
// hourly or less, can't keep up with 40+ projects' worth of subreddits.
// Set to a multiple of MAX_SUBREDDITS_PER_BATCH so it's always "however
// many whole chunks we select for," not an arbitrary number independent of
// the chunk size.
const MAX_REDDIT_SOURCES_PER_RUN = MAX_SUBREDDITS_PER_BATCH * 6;
// Reddit's unauthenticated RSS access is rate-limited to roughly one
// request per ~60s, globally per IP (see fetch-posts.ts) — this is that
// spacing plus a small safety margin, the same figure
// scripts/verify-reddit-batching.ts uses against live Reddit.
const REDDIT_REQUEST_SPACING_MS = 62_000;
// Stack Exchange has no Reddit-style multi-site query syntax (see
// fetch-stackexchange.ts) — one request per site, and each request spends
// real, finite daily quota (300/day unauthenticated, 10,000/day with an app
// key) rather than facing Reddit's soft per-request throttle. Capped well
// under even the unauthenticated quota so one run monitoring several sites
// can't come close to exhausting a whole day's budget by itself.
const MAX_STACKEXCHANGE_SOURCES_PER_RUN = 20;
// Soft ceiling on total run time, kept under `maxDuration` (300s on the
// cron route) so a run that's about to be hard-killed exits early instead
// of being cut off mid-request, returning a real (partial) summary.
// Sources it didn't reach are simply still the stalest candidates next
// run, since lastPolledAt is only updated for sources actually attempted.
//
// Trimmed from 270s to leave headroom for search-mode ingestion, which now
// runs right after this in the same invocation (see
// cron/poll-signals/route.ts and api/poll-stream/route.ts) and has no
// time-budget cutoff of its own.
const RUN_TIME_BUDGET_MS = 200_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RawSourcePost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

type SourceWithProduct = Source & {
  product: Product & { user: User; positioning: Positioning | null };
};

// Hacker News, IndieHackers, and Ask MetaFilter are each one shared feed,
// not a per-project target — `caches.hn`/`caches.ih`/`caches.amf` let every
// source of that type encountered in a single run reuse one upstream fetch
// instead of hitting the feed once per project that monitors it. Stack
// Exchange is the same idea per-site instead: one request-per-site batch
// (fetchNewQuestionsForSites), sliced back apart per source below. Reddit
// is handled entirely separately (see pollRedditSources) since it needs
// rate-limit-spaced chunking that the other three don't.
async function fetchForNonRedditSource(
  source: { type: SourceType; name: string },
  caches: {
    se: { promise?: Promise<Map<string, RawSourcePost[]>> };
    hn: { promise?: Promise<RawSourcePost[]> };
    ih: { promise?: Promise<RawSourcePost[]> };
    amf: { promise?: Promise<RawSourcePost[]> };
  },
  stackExchangeSiteSlugs: string[]
): Promise<RawSourcePost[]> {
  if (source.type === "HACKERNEWS") {
    caches.hn.promise ??= fetchNewHackerNewsStories();
    return caches.hn.promise;
  }
  if (source.type === "INDIEHACKERS") {
    caches.ih.promise ??= fetchNewIndieHackersPosts();
    return caches.ih.promise;
  }
  if (source.type === "ASKMETAFILTER") {
    caches.amf.promise ??= fetchNewAskMetaFilterPosts();
    return caches.amf.promise;
  }
  caches.se.promise ??= fetchNewQuestionsForSites(stackExchangeSiteSlugs);
  const postsBySite = await caches.se.promise;
  return postsBySite.get(source.name.toLowerCase()) ?? [];
}

// One batch: fetch new posts for the least-recently-polled sources, skip
// anything already scored (dedup table — the highest-volume AI call in the
// product, so never re-score the same post), score the rest, and only
// create a Signal for posts at or above that product's relevance threshold.
// A single bad post/source is logged and skipped rather than aborting
// the run. `onProgress` is optional — the cron job ignores it; the
// streaming manual-poll route uses it to report live status.
export async function pollAllSources(options?: {
  userId?: string;
  productId?: string;
  onProgress?: (event: PollProgressEvent) => void;
}): Promise<PollSummary> {
  const emit = options?.onProgress ?? (() => {});
  const runStartedAt = Date.now();
  const timeBudgetExceeded = () => Date.now() - runStartedAt > RUN_TIME_BUDGET_MS;

  // Archived projects (see the Danger Zone in project settings) are
  // excluded from every poll trigger — cron batch AND a manual poll of one
  // specific product — so ingestion actually stops rather than silently
  // continuing to spend Signal Scoring calls on a project the founder
  // archived.
  const productFilter = {
    archivedAt: null,
    ...(options?.userId ? { userId: options.userId } : {}),
  };
  const staleFirst = [
    { lastPolledAt: { sort: "asc" as const, nulls: "first" as const } },
    { createdAt: "asc" as const },
  ];
  const sourceInclude = { product: { include: { user: true, positioning: true } } };

  const redditSources = await prisma.source.findMany({
    where: {
      selected: true,
      type: "REDDIT_SUBREDDIT",
      product: productFilter,
      ...(options?.productId ? { productId: options.productId } : {}),
    },
    include: sourceInclude,
    orderBy: staleFirst,
    take: MAX_REDDIT_SOURCES_PER_RUN,
  });

  const nonRedditSources = await prisma.source.findMany({
    where: {
      selected: true,
      type: { in: ["HACKERNEWS", "INDIEHACKERS", "ASKMETAFILTER"] },
      product: productFilter,
      ...(options?.productId ? { productId: options.productId } : {}),
    },
    include: sourceInclude,
    orderBy: staleFirst,
    take: MAX_NON_REDDIT_SOURCES_PER_RUN,
  });

  const stackExchangeSources = await prisma.source.findMany({
    where: {
      selected: true,
      type: "STACKEXCHANGE",
      product: productFilter,
      ...(options?.productId ? { productId: options.productId } : {}),
    },
    include: sourceInclude,
    orderBy: staleFirst,
    take: MAX_STACKEXCHANGE_SOURCES_PER_RUN,
  });

  const summary: PollSummary = {
    sourcesPolled: 0,
    postsFetched: 0,
    postsScored: 0,
    signalsCreated: 0,
    errors: 0,
  };

  // Soft daily cap on Signal Scoring calls, per project — covers every
  // source type combined (it counts ScoredPost rows by productId, not by
  // source), cached per run so repeated checks within the same batch don't
  // re-query on every post.
  const scoredTodayByProduct = new Map<string, number>();
  async function scoredTodayFor(productId: string): Promise<number> {
    const cached = scoredTodayByProduct.get(productId);
    if (cached !== undefined) return cached;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await prisma.scoredPost.count({
      where: { source: { productId }, scoredAt: { gte: todayStart } },
    });
    scoredTodayByProduct.set(productId, count);
    return count;
  }

  // Same idea, summed across every project the account owns — otherwise the
  // per-project cap above is trivially bypassed by creating more projects.
  // Kept as a separate cache/query (not derived from scoredTodayByProduct)
  // since a batch can include only a subset of one account's projects/sources.
  const scoredTodayByAccount = new Map<string, number>();
  async function scoredTodayForAccount(userId: string): Promise<number> {
    const cached = scoredTodayByAccount.get(userId);
    if (cached !== undefined) return cached;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const count = await prisma.scoredPost.count({
      where: { source: { product: { userId } }, scoredAt: { gte: todayStart } },
    });
    scoredTodayByAccount.set(userId, count);
    return count;
  }

  // Accumulates signals for any product still awaiting its one-time "your
  // first signals are ready" email (sent in the loop over this map, below
  // the main source loop) — gathered across every source of that product
  // in this run, since a project can have several sources and its
  // first-ever signals may land from more than one of them in the same
  // batch. Keyed by productId rather than sent inline per-signal so the
  // eventual email can pick the highest-scoring 2-3 across the whole
  // batch, not just whichever source happened to be processed first.
  const pendingFirstSignalEmails = new Map<string, PendingFirstSignalBucket>();

  const totalSources = redditSources.length + nonRedditSources.length + stackExchangeSources.length;
  let processedCount = 0;

  // Shared by both the Reddit pass and the non-Reddit pass — everything
  // from "already scored?" dedup through scoring, signal creation,
  // notification, and first-signal-email bucketing. Fetching (and its own
  // per-source-type bookkeeping/error handling) happens before this is
  // called; this only ever sees posts that were already fetched
  // successfully.
  async function scoreAndCreateSignals(source: SourceWithProduct, posts: RawSourcePost[], sourceLabel: string) {
    summary.postsFetched += posts.length;
    let signalsCreatedForSource = 0;

    // One query instead of one findUnique per post — the same batching idea
    // as the AI scoring calls below, applied to the dedup check.
    const alreadyScoredIds = new Set(
      (
        await prisma.scoredPost.findMany({
          where: { sourceId: source.id, externalId: { in: posts.map((p) => p.id) } },
          select: { externalId: true },
        })
      ).map((row) => row.externalId)
    );
    const unscoredPosts = posts.filter((post) => !alreadyScoredIds.has(post.id));

    for (let i = 0; i < unscoredPosts.length; ) {
      const scoredToday = await scoredTodayFor(source.product.id);
      const scoredTodayAccount = await scoredTodayForAccount(source.product.userId);
      const exempt = isExemptFromLimits(source.product.user.email);
      const projectHeadroom = exempt ? Infinity : DAILY_SCORING_CAP_PER_PROJECT - scoredToday;
      const accountHeadroom = exempt ? Infinity : DAILY_SCORING_CAP_PER_ACCOUNT - scoredTodayAccount;

      if (projectHeadroom <= 0) {
        console.warn(
          `[poll] daily Signal Scoring cap (${DAILY_SCORING_CAP_PER_PROJECT}) reached for product ${source.product.id} — pausing scoring for its sources until tomorrow`
        );
        emit({ type: "daily-cap-reached", sourceName: sourceLabel });
        break;
      }
      if (accountHeadroom <= 0) {
        console.warn(
          `[poll] daily Signal Scoring cap (${DAILY_SCORING_CAP_PER_ACCOUNT}) reached for account ${source.product.userId} — pausing scoring for all its projects until tomorrow`
        );
        emit({ type: "daily-cap-reached", sourceName: sourceLabel });
        break;
      }

      // Batch size respects both the fixed scoring-batch limit and however
      // much of today's cap headroom is left, so a batch never scores past
      // either cap even when the remaining allowance is smaller than a full
      // batch.
      const batchSize = Math.max(
        1,
        Math.min(MAX_POSTS_PER_SCORING_BATCH, projectHeadroom, accountHeadroom, unscoredPosts.length - i)
      );
      const batch = unscoredPosts.slice(i, i + batchSize);
      i += batchSize;

      const batchResult = await scoreBatchAndCreateSignals(
        { id: source.id, type: source.type, name: source.name },
        source.product,
        batch.map((post) => ({
          externalId: post.id,
          title: post.title,
          body: post.selftext,
          permalink: post.permalink,
          author: post.author,
          postedAt: post.createdAt,
        })),
        pendingFirstSignalEmails,
        {
          onScored: (index, relevanceScore, passed) => {
            emit({
              type: "post-scored",
              sourceName: sourceLabel,
              title: batch[index].title,
              score: relevanceScore,
              passed,
            });
          },
          onSignalCreated: (index) => {
            summary.signalsCreated += 1;
            signalsCreatedForSource += 1;
            emit({ type: "signal-created", sourceName: sourceLabel, title: batch[index].title });
          },
        }
      );

      summary.postsScored += batchResult.scored;
      summary.errors += batchResult.errors;
      scoredTodayByProduct.set(source.product.id, scoredToday + batchResult.scored);
      scoredTodayByAccount.set(source.product.userId, scoredTodayAccount + batchResult.scored);
    }

    // Server-side counterpart to the client-only funnel today — without
    // this, PostHog can't tell "no signals were ever generated for this
    // project" apart from "signals existed but the user never came back",
    // since both look identical from client events alone (there's simply no
    // client present when a cron run is what creates them).
    if (signalsCreatedForSource > 0) {
      await captureServerEvent(source.product.userId, "signals_generated", {
        project_id: source.product.id,
        count: signalsCreatedForSource,
        source: sourceLabel,
      });
    }
  }

  async function recordFetchSuccess(source: SourceWithProduct, posts: RawSourcePost[], sourceLabel: string) {
    emit({ type: "source-fetched", name: sourceLabel, postCount: posts.length });
    const updated = await prisma.source.update({
      where: { id: source.id },
      data: {
        lastPolledAt: new Date(),
        lastSuccessfulPollAt: new Date(),
        consecutiveFailures: 0,
        consecutiveEmptyPolls: posts.length === 0 ? { increment: 1 } : 0,
      },
    });
    if (updated.consecutiveEmptyPolls >= CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD) {
      if (updated.consecutiveEmptyPolls === CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD) {
        console.warn(
          `[poll] ${source.name} has fetched successfully but returned 0 posts ${updated.consecutiveEmptyPolls} polls in a row — likely a silent no-op (wrong endpoint, empty-by-construction query), not just a quiet source`
        );
      }
      emit({
        type: "ingestion-empty",
        sourceName: sourceLabel,
        consecutiveEmptyPolls: updated.consecutiveEmptyPolls,
      });
    }
  }

  async function recordFetchFailure(source: SourceWithProduct, sourceLabel: string, error: unknown) {
    console.error(`[poll] failed to fetch ${source.name}`, error);
    Sentry.captureException(error, { tags: { source: source.name, sourceType: source.type } });
    summary.errors += 1;
    emit({
      type: "source-error",
      name: sourceLabel,
      message: error instanceof Error ? error.message : "Fetch failed",
    });
    const updated = await prisma.source.update({
      where: { id: source.id },
      data: { lastPolledAt: new Date(), consecutiveFailures: { increment: 1 } },
    });
    if (updated.consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD) {
      if (updated.consecutiveFailures === CONSECUTIVE_FAILURE_ALERT_THRESHOLD) {
        console.warn(
          `[poll] ${source.name} has failed to fetch ${updated.consecutiveFailures} times in a row — ingestion may be broken for this source`
        );
      }
      emit({
        type: "ingestion-failing",
        sourceName: sourceLabel,
        consecutiveFailures: updated.consecutiveFailures,
      });
    }
  }

  // Reddit gets its own pass, chunked into MAX_SUBREDDITS_PER_BATCH-sized,
  // rate-limit-spaced requests, rather than the old single combined
  // request for the whole run. A run only starts a new chunk if there's
  // still time left in the budget; chunks it never reaches are simply
  // still the stalest candidates next run, same as any other over-budget
  // source. This is what lets one run cover more than one chunk's worth of
  // Reddit sources — previously the hard ceiling on Reddit coverage per
  // run was whatever fit in a single request, regardless of how much of
  // the time budget went unused.
  async function pollRedditSources(sources: SourceWithProduct[]) {
    let lastRequestAt: number | null = null;

    for (let i = 0; i < sources.length; i += MAX_SUBREDDITS_PER_BATCH) {
      if (timeBudgetExceeded()) {
        console.warn(
          `[poll] time budget reached before starting Reddit chunk ${i}-${i + MAX_SUBREDDITS_PER_BATCH} — remaining Reddit sources stay stalest-first for next run`
        );
        break;
      }

      if (lastRequestAt !== null) {
        const waitMs = REDDIT_REQUEST_SPACING_MS - (Date.now() - lastRequestAt);
        if (waitMs > 0) await sleep(waitMs);
      }
      // Re-check after any wait above — the spacing delay itself can push
      // a run over budget for a chunk that isn't worth starting anymore.
      if (timeBudgetExceeded()) break;

      const chunk = sources.slice(i, i + MAX_SUBREDDITS_PER_BATCH);
      lastRequestAt = Date.now();

      let postsByName: Map<string, RawSourcePost[]>;
      try {
        postsByName = await fetchNewPostsForSubreddits(chunk.map((s) => s.name));
      } catch (error) {
        // One failed request affects every subreddit combined into it —
        // each still gets its own consecutiveFailures bookkeeping, same as
        // if each had failed independently.
        for (const source of chunk) {
          const sourceLabel = formatSourceLabel(source.type, source.name);
          summary.sourcesPolled += 1;
          processedCount += 1;
          emit({ type: "source-start", name: sourceLabel, index: processedCount, total: totalSources });
          await recordFetchFailure(source, sourceLabel, error);
        }
        continue;
      }

      for (const source of chunk) {
        if (timeBudgetExceeded()) {
          console.warn(
            `[poll] time budget reached mid-chunk after ${summary.sourcesPolled}/${totalSources} sources — stopping run early`
          );
          return;
        }
        const sourceLabel = formatSourceLabel(source.type, source.name);
        summary.sourcesPolled += 1;
        processedCount += 1;
        emit({ type: "source-start", name: sourceLabel, index: processedCount, total: totalSources });
        const posts = postsByName.get(source.name.toLowerCase()) ?? [];
        await recordFetchSuccess(source, posts, sourceLabel);
        await scoreAndCreateSignals(source, posts, sourceLabel);
      }
    }
  }

  async function pollNonRedditSources(sources: SourceWithProduct[], stackExchangeSiteSlugs: string[]) {
    const caches = {
      se: {} as { promise?: Promise<Map<string, RawSourcePost[]>> },
      hn: {} as { promise?: Promise<RawSourcePost[]> },
      ih: {} as { promise?: Promise<RawSourcePost[]> },
      amf: {} as { promise?: Promise<RawSourcePost[]> },
    };

    for (const source of sources) {
      if (timeBudgetExceeded()) {
        console.warn(
          `[poll] time budget reached after ${summary.sourcesPolled}/${totalSources} sources — stopping run early, the rest stay stalest-first for next run`
        );
        break;
      }

      const sourceLabel = formatSourceLabel(source.type, source.name);
      summary.sourcesPolled += 1;
      processedCount += 1;
      emit({ type: "source-start", name: sourceLabel, index: processedCount, total: totalSources });

      let posts: RawSourcePost[];
      try {
        posts = await fetchForNonRedditSource(source, caches, stackExchangeSiteSlugs);
      } catch (error) {
        await recordFetchFailure(source, sourceLabel, error);
        continue;
      }
      await recordFetchSuccess(source, posts, sourceLabel);
      await scoreAndCreateSignals(source, posts, sourceLabel);
    }
  }

  // Non-Reddit sources first: they're cheap (shared feeds, no rate-limit
  // spacing) and previously always completed within the time budget, so
  // running them before Reddit's slower, chunked pass means they're never
  // starved by Reddit's spacing eating the whole run — Reddit is exactly
  // the source type designed to gracefully stop early and pick up next run.
  const stackExchangeSiteSlugs = stackExchangeSources.map((s) => s.name);
  await pollNonRedditSources([...stackExchangeSources, ...nonRedditSources], stackExchangeSiteSlugs);
  await pollRedditSources(redditSources);

  await flushPendingFirstSignalEmails(pendingFirstSignalEmails);

  return summary;
}
