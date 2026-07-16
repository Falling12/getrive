import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { fetchNewPostsForSubreddits, MAX_SUBREDDITS_PER_BATCH } from "@/lib/reddit/fetch-posts";
import { fetchNewHackerNewsStories } from "@/lib/hackernews/fetch-hackernews";
import { fetchNewIndieHackersPosts } from "@/lib/indiehackers/fetch-indiehackers";
import { scorePosts, MAX_POSTS_PER_SCORING_BATCH } from "@/lib/ai/signal-scoring";
import {
  DAILY_SCORING_CAP_PER_PROJECT,
  DAILY_SCORING_CAP_PER_ACCOUNT,
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD,
  isExemptFromLimits,
} from "@/lib/limits";
import { notifySignalCreated } from "@/lib/services/notification.service";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { formatSourceLabel } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

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

// Hacker News and IndieHackers sources cost one shared, cached fetch (see
// caches.hn/caches.ih below) plus per-post Signal Scoring, already bounded by
// the daily scoring caps in lib/limits.ts — there's no external rate limit
// on either, so a run sweeps every due source of these types rather than
// throttling to a handful per run.
const MAX_NON_REDDIT_SOURCES_PER_RUN = 100;
// Reddit sources are also fetched as one shared, batched request per run
// (see caches.reddit below and MAX_SUBREDDITS_PER_BATCH in fetch-posts.ts) —
// Reddit's global per-IP rate limit applies per *request*, not per
// subreddit, so combining every due subreddit into a single request removes
// the scarcity that used to force a tiny per-run cap here. Matches the
// batch size so `take` never selects more subreddits than one request can
// actually combine.
const MAX_REDDIT_SOURCES_PER_RUN = MAX_SUBREDDITS_PER_BATCH;
// Soft ceiling on total run time, kept under `maxDuration` (300s on the
// cron route) so a run that's about to be hard-killed exits early after its
// current source instead, returning a real (partial) summary. Sources it
// didn't reach are simply still the stalest candidates next run, since
// lastPolledAt is only updated for sources actually attempted.
const RUN_TIME_BUDGET_MS = 270_000;

interface RawSourcePost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

// Hacker News and IndieHackers are each one shared feed, not a per-project
// target — `caches.hn`/`caches.ih` let every source of that type encountered
// in a single run reuse one upstream fetch instead of hitting the feed once
// per project that monitors it. `caches.reddit` is the same idea applied to
// every Reddit source in the run at once: one combined-subreddit request
// (see fetchNewPostsForSubreddits), sliced back apart per source below.
async function fetchForSource(
  source: { type: SourceType; name: string },
  caches: {
    reddit: { promise?: Promise<Map<string, RawSourcePost[]>> };
    hn: { promise?: Promise<RawSourcePost[]> };
    ih: { promise?: Promise<RawSourcePost[]> };
  },
  redditSubredditNames: string[]
): Promise<RawSourcePost[]> {
  if (source.type === "HACKERNEWS") {
    caches.hn.promise ??= fetchNewHackerNewsStories();
    return caches.hn.promise;
  }
  if (source.type === "INDIEHACKERS") {
    caches.ih.promise ??= fetchNewIndieHackersPosts();
    return caches.ih.promise;
  }
  caches.reddit.promise ??= fetchNewPostsForSubreddits(redditSubredditNames);
  const postsByName = await caches.reddit.promise;
  return postsByName.get(source.name.toLowerCase()) ?? [];
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

  // Reddit sources no longer need a per-account fairness pass: since every
  // due subreddit in the run shares one combined request (see caches.reddit
  // below), including a second source from the same account doesn't cost
  // any other account a turn the way a dedicated serialized request used to.
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
      type: { in: ["HACKERNEWS", "INDIEHACKERS"] },
      product: productFilter,
      ...(options?.productId ? { productId: options.productId } : {}),
    },
    include: sourceInclude,
    orderBy: staleFirst,
    take: MAX_NON_REDDIT_SOURCES_PER_RUN,
  });

  // Merged back into one staleness-ordered run for processing/progress-event
  // order; every Reddit source's raw posts still come from a single shared
  // batch request (see caches.reddit below), regardless of where in this list
  // it ends up.
  const sources = [...redditSources, ...nonRedditSources].sort(
    (a, b) => (a.lastPolledAt?.getTime() ?? 0) - (b.lastPolledAt?.getTime() ?? 0)
  );
  // Computed once up front — every Reddit source in the run is fetched via
  // one combined-subreddit request keyed to this exact list (see
  // fetchForSource), not discovered incrementally as the loop encounters them.
  const redditSubredditNames = redditSources.map((s) => s.name);

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

  const caches = {
    reddit: {} as { promise?: Promise<Map<string, RawSourcePost[]>> },
    hn: {} as { promise?: Promise<RawSourcePost[]> },
    ih: {} as { promise?: Promise<RawSourcePost[]> },
  };
  const runStartedAt = Date.now();

  for (const [index, source] of sources.entries()) {
    if (Date.now() - runStartedAt > RUN_TIME_BUDGET_MS) {
      console.warn(
        `[poll] time budget reached after ${summary.sourcesPolled}/${sources.length} sources — stopping run early, the rest stay stalest-first for next run`
      );
      break;
    }

    const sourceLabel = formatSourceLabel(source.type, source.name);
    summary.sourcesPolled += 1;
    emit({
      type: "source-start",
      name: sourceLabel,
      index: index + 1,
      total: sources.length,
    });

    let posts: RawSourcePost[];
    try {
      posts = await fetchForSource(source, caches, redditSubredditNames);
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
    } catch (error) {
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
      continue;
    }
    summary.postsFetched += posts.length;

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

      let results: { relevanceScore: number; reason: string }[];
      try {
        results = await scorePosts({
          productDescription: source.product.description,
          sourceType: source.type,
          sourceName: source.name,
          posts: batch.map((post) => ({ postTitle: post.title, postBody: post.selftext })),
          icpContext: describeSelectedIcp(source.product.positioning),
        });
      } catch (error) {
        // The whole batch failed together (network/parsing error) — none of
        // these posts got a ScoredPost row, so they're simply still unscored
        // next poll (same fault-tolerance as a single post failing before).
        console.error(`[poll] failed to score a batch of ${batch.length} posts in ${source.name}`, error);
        Sentry.captureException(error, { tags: { source: source.name, sourceType: source.type } });
        summary.errors += batch.length;
        continue;
      }

      summary.postsScored += results.length;
      scoredTodayByProduct.set(source.product.id, scoredToday + results.length);
      scoredTodayByAccount.set(source.product.userId, scoredTodayAccount + results.length);

      for (const [batchIndex, post] of batch.entries()) {
        try {
          const { relevanceScore, reason } = results[batchIndex];
          const passed = relevanceScore >= source.product.relevanceThreshold;
          emit({
            type: "post-scored",
            sourceName: sourceLabel,
            title: post.title,
            score: relevanceScore,
            passed,
          });

          await prisma.scoredPost.create({
            data: {
              sourceId: source.id,
              externalId: post.id,
              title: post.title,
              permalink: post.permalink,
              relevanceScore,
              passed,
            },
          });

          if (passed) {
            const signal = await prisma.signal.create({
              data: {
                sourceId: source.id,
                externalId: post.id,
                title: post.title,
                body: post.selftext,
                permalink: post.permalink,
                author: post.author,
                relevanceScore,
                relevanceReason: reason,
                postedAt: post.createdAt,
              },
            });
            summary.signalsCreated += 1;
            emit({ type: "signal-created", sourceName: sourceLabel, title: post.title });

            await notifySignalCreated({
              userEmail: source.product.user.email,
              notifyNewSignal: source.product.user.notifyNewSignal,
              productId: source.product.id,
              productName: source.product.name,
              sourceType: source.type,
              sourceName: source.name,
              signalId: signal.id,
              title: post.title,
              body: post.selftext,
            });
          }
        } catch (error) {
          console.error(`[poll] failed to persist scored post ${post.id} in ${source.name}`, error);
          Sentry.captureException(error, { tags: { source: source.name, postId: post.id } });
          summary.errors += 1;
        }
      }
    }
  }

  return summary;
}
