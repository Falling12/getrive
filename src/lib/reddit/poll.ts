import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { fetchNewPosts } from "@/lib/reddit/fetch-posts";
import { fetchNewHackerNewsStories } from "@/lib/hackernews/fetch-hackernews";
import { scorePost } from "@/lib/ai/signal-scoring";
import {
  DAILY_SCORING_CAP_PER_PROJECT,
  DAILY_SCORING_CAP_PER_ACCOUNT,
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  isLocalDev,
} from "@/lib/limits";
import { notifySignalCreated } from "@/lib/services/notification.service";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { formatSourceLabel } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

// This file lives under lib/reddit/ from when Getrive only ingested Reddit;
// it's now the shared multi-source polling engine (Reddit + Hacker News, with
// Twitter/X reserved). Left at this path to avoid an import-path rename
// across every consumer for what's otherwise a naming-only concern.

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
  | { type: "waiting"; secondsLeft: number; nextSource: string }
  | { type: "daily-cap-reached"; sourceName: string }
  | { type: "ingestion-failing"; sourceName: string; consecutiveFailures: number };

// A manual poll can legitimately run long (3 sources x up to 62s Reddit
// spacing, plus scoring time per post — 3+ minutes isn't unusual).
// Product.activePollStartedAt is treated as stale past this, so a crashed
// run can't leave the button permanently disabled.
export const POLL_STALE_MINUTES = 20;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reddit's unauthenticated RSS access is rate-limited to roughly one request
// per ~60 seconds, GLOBALLY per IP — confirmed empirically (x-ratelimit-remaining
// hits 0 after a single request, resetting ~54-60s later), not per-subreddit.
// This constraint is Reddit-specific; Hacker News's public API has no such
// limit for reasonable use, so the spacing below only applies between
// Reddit fetches (see hasFetchedReddit), not before/after Hacker News ones.
const REQUEST_SPACING_MS = 62_000;
const WAIT_TICK_MS = 1_000;
const MAX_SOURCES_PER_RUN = 3;
// Only relevant to the unscoped, cron-triggered batch (no options.userId) —
// caps how many of one account's sources a single run can select, so an
// account with many sources (or a burst of brand-new ones, all tied for
// "never polled") can't fill the whole batch and shut every other account
// out of that run. A scoped manual poll of one project has no cross-account
// fairness question to enforce, so it's exempt (see isScopedToOneAccount).
const MAX_SOURCES_PER_ACCOUNT_PER_RUN = 1;
// How many staleness-ordered candidates to pull before applying that
// per-account cap — wide enough that the cap above has room to actually
// pick sources from several different accounts, not just re-discover the
// same single dominant account past the first MAX_SOURCES_PER_RUN rows.
const CANDIDATE_POOL_SIZE = 60;

interface RawSourcePost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

// Hacker News is one shared feed, not a per-project target — `hnCache` lets
// every Hacker News source encountered in a single run reuse one upstream
// fetch instead of hitting the API once per project that monitors it.
async function fetchForSource(
  source: { type: SourceType; name: string },
  hnCache: { promise?: Promise<RawSourcePost[]> }
): Promise<RawSourcePost[]> {
  if (source.type === "HACKERNEWS") {
    hnCache.promise ??= fetchNewHackerNewsStories();
    return hnCache.promise;
  }
  return fetchNewPosts(source.name);
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

  // A manual poll always targets one specific project (productId, and
  // implicitly one account) — there's nothing to be "fair" between in that
  // case, and the founder is actively waiting on all of that project's due
  // sources, not a fairness-throttled subset of them.
  const isScopedToOneAccount = Boolean(options?.userId || options?.productId);

  const candidates = await prisma.source.findMany({
    where: {
      selected: true,
      // Archived projects (see the Danger Zone in project settings) are
      // excluded from every poll trigger — cron batch AND a manual poll of
      // one specific product — so ingestion actually stops rather than
      // silently continuing to spend Signal Scoring calls on a project the
      // founder archived.
      product: {
        archivedAt: null,
        ...(options?.userId ? { userId: options.userId } : {}),
      },
      ...(options?.productId ? { productId: options.productId } : {}),
    },
    include: { product: { include: { user: true, positioning: true } } },
    orderBy: [{ lastPolledAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    take: isScopedToOneAccount ? MAX_SOURCES_PER_RUN : CANDIDATE_POOL_SIZE,
  });

  let sources = candidates;
  if (!isScopedToOneAccount) {
    const selectedPerAccount = new Map<string, number>();
    sources = [];
    for (const candidate of candidates) {
      if (sources.length >= MAX_SOURCES_PER_RUN) break;
      const accountId = candidate.product.userId;
      const selectedSoFar = selectedPerAccount.get(accountId) ?? 0;
      if (selectedSoFar >= MAX_SOURCES_PER_ACCOUNT_PER_RUN) continue;
      selectedPerAccount.set(accountId, selectedSoFar + 1);
      sources.push(candidate);
    }
  }

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

  const hnCache: { promise?: Promise<RawSourcePost[]> } = {};
  let hasFetchedReddit = false;

  for (const [index, source] of sources.entries()) {
    const sourceLabel = formatSourceLabel(source.type, source.name);
    const isReddit = source.type === "REDDIT_SUBREDDIT";
    if (isReddit && hasFetchedReddit) {
      for (let waited = 0; waited < REQUEST_SPACING_MS; waited += WAIT_TICK_MS) {
        emit({
          type: "waiting",
          secondsLeft: Math.ceil((REQUEST_SPACING_MS - waited) / 1000),
          nextSource: sourceLabel,
        });
        await sleep(WAIT_TICK_MS);
      }
    }
    if (isReddit) hasFetchedReddit = true;

    summary.sourcesPolled += 1;
    emit({
      type: "source-start",
      name: sourceLabel,
      index: index + 1,
      total: sources.length,
    });

    let posts: RawSourcePost[];
    try {
      posts = await fetchForSource(source, hnCache);
      emit({ type: "source-fetched", name: sourceLabel, postCount: posts.length });
      await prisma.source.update({
        where: { id: source.id },
        data: { lastPolledAt: new Date(), lastSuccessfulPollAt: new Date(), consecutiveFailures: 0 },
      });
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

    for (const post of posts) {
      try {
        const alreadyScored = await prisma.scoredPost.findUnique({
          where: {
            sourceId_externalId: {
              sourceId: source.id,
              externalId: post.id,
            },
          },
        });
        if (alreadyScored) continue;

        const scoredToday = await scoredTodayFor(source.product.id);
        if (!isLocalDev && scoredToday >= DAILY_SCORING_CAP_PER_PROJECT) {
          console.warn(
            `[poll] daily Signal Scoring cap (${DAILY_SCORING_CAP_PER_PROJECT}) reached for product ${source.product.id} — pausing scoring for its sources until tomorrow`
          );
          emit({ type: "daily-cap-reached", sourceName: sourceLabel });
          break;
        }

        const scoredTodayAccount = await scoredTodayForAccount(source.product.userId);
        if (!isLocalDev && scoredTodayAccount >= DAILY_SCORING_CAP_PER_ACCOUNT) {
          console.warn(
            `[poll] daily Signal Scoring cap (${DAILY_SCORING_CAP_PER_ACCOUNT}) reached for account ${source.product.userId} — pausing scoring for all its projects until tomorrow`
          );
          emit({ type: "daily-cap-reached", sourceName: sourceLabel });
          break;
        }

        const { relevanceScore, reason } = await scorePost({
          productDescription: source.product.description,
          sourceType: source.type,
          sourceName: source.name,
          postTitle: post.title,
          postBody: post.selftext,
          icpContext: describeSelectedIcp(source.product.positioning),
        });
        summary.postsScored += 1;
        scoredTodayByProduct.set(source.product.id, scoredToday + 1);
        scoredTodayByAccount.set(source.product.userId, scoredTodayAccount + 1);

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
        console.error(`[poll] failed to score post ${post.id} in ${source.name}`, error);
        Sentry.captureException(error, { tags: { source: source.name, postId: post.id } });
        summary.errors += 1;
      }
    }
  }

  return summary;
}
