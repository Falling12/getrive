import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { fetchNewPostsForSubreddits, MAX_SUBREDDITS_PER_BATCH } from "@/lib/reddit/fetch-posts";
import { fetchNewHackerNewsStories } from "@/lib/hackernews/fetch-hackernews";
import { fetchNewIndieHackersPosts } from "@/lib/indiehackers/fetch-indiehackers";
import { fetchNewQuestionsForSites } from "@/lib/stackexchange/fetch-stackexchange";
import { fetchNewAskMetaFilterPosts } from "@/lib/askmetafilter/fetch-askmetafilter";
import { scorePosts, MAX_POSTS_PER_SCORING_BATCH } from "@/lib/ai/signal-scoring";
import {
  DAILY_SCORING_CAP_PER_PROJECT,
  DAILY_SCORING_CAP_PER_ACCOUNT,
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD,
  isExemptFromLimits,
} from "@/lib/limits";
import { notifySignalCreated } from "@/lib/services/notification.service";
import { sendEmail } from "@/lib/email";
import { firstSignalsEmailTemplate, type DigestSignalItem } from "@/lib/email-templates";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { formatSourceLabel } from "@/lib/sources/format";
import { appUrl } from "@/lib/config";
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

// Hacker News, IndieHackers, and Ask MetaFilter sources cost one shared,
// cached fetch (see caches.hn/caches.ih/caches.amf below) plus per-post
// Signal Scoring, already bounded by the daily scoring caps in
// lib/limits.ts — there's no external rate limit on any of the three, so a
// run sweeps every due source of these types rather than throttling to a
// handful per run.
const MAX_NON_REDDIT_SOURCES_PER_RUN = 100;
// Reddit sources are also fetched as one shared, batched request per run
// (see caches.reddit below and MAX_SUBREDDITS_PER_BATCH in fetch-posts.ts) —
// Reddit's global per-IP rate limit applies per *request*, not per
// subreddit, so combining every due subreddit into a single request removes
// the scarcity that used to force a tiny per-run cap here. Matches the
// batch size so `take` never selects more subreddits than one request can
// actually combine.
const MAX_REDDIT_SOURCES_PER_RUN = MAX_SUBREDDITS_PER_BATCH;
// Stack Exchange has no Reddit-style multi-site query syntax (see
// fetch-stackexchange.ts) — one request per site, and each request spends
// real, finite daily quota (300/day unauthenticated, 10,000/day with an app
// key) rather than facing Reddit's soft per-request throttle. Capped well
// under even the unauthenticated quota so one run monitoring several sites
// can't come close to exhausting a whole day's budget by itself.
const MAX_STACKEXCHANGE_SOURCES_PER_RUN = 20;
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

// Hacker News, IndieHackers, and Ask MetaFilter are each one shared feed,
// not a per-project target — `caches.hn`/`caches.ih`/`caches.amf` let every
// source of that type encountered in a single run reuse one upstream fetch
// instead of hitting the feed once per project that monitors it.
// `caches.reddit`/`caches.se` are the same idea applied per-community
// instead: one combined-subreddit request (fetchNewPostsForSubreddits) or
// one request-per-site batch (fetchNewQuestionsForSites), each sliced back
// apart per source below.
async function fetchForSource(
  source: { type: SourceType; name: string },
  caches: {
    reddit: { promise?: Promise<Map<string, RawSourcePost[]>> };
    se: { promise?: Promise<Map<string, RawSourcePost[]>> };
    hn: { promise?: Promise<RawSourcePost[]> };
    ih: { promise?: Promise<RawSourcePost[]> };
    amf: { promise?: Promise<RawSourcePost[]> };
  },
  redditSubredditNames: string[],
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
  if (source.type === "STACKEXCHANGE") {
    caches.se.promise ??= fetchNewQuestionsForSites(stackExchangeSiteSlugs);
    const postsBySite = await caches.se.promise;
    return postsBySite.get(source.name.toLowerCase()) ?? [];
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
      type: { in: ["HACKERNEWS", "INDIEHACKERS", "ASKMETAFILTER"] },
      product: productFilter,
      ...(options?.productId ? { productId: options.productId } : {}),
    },
    include: sourceInclude,
    orderBy: staleFirst,
    take: MAX_NON_REDDIT_SOURCES_PER_RUN,
  });

  // Same fairness reasoning as Reddit's query above no longer applying (see
  // its comment) doesn't hold for Stack Exchange — each site still costs its
  // own real request against a finite daily quota (see
  // MAX_STACKEXCHANGE_SOURCES_PER_RUN), so it gets a dedicated, separately
  // capped query rather than folding into nonRedditSources.
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

  // Merged back into one staleness-ordered run for processing/progress-event
  // order; every Reddit/Stack Exchange source's raw posts still come from a
  // single shared batch request (see caches.reddit/caches.se below),
  // regardless of where in this list it ends up.
  const sources = [...redditSources, ...stackExchangeSources, ...nonRedditSources].sort(
    (a, b) => (a.lastPolledAt?.getTime() ?? 0) - (b.lastPolledAt?.getTime() ?? 0)
  );
  // Computed once up front — every Reddit/Stack Exchange source in the run
  // is fetched via one combined-subreddit request or one request-per-site
  // batch keyed to this exact list (see fetchForSource), not discovered
  // incrementally as the loop encounters them.
  const redditSubredditNames = redditSources.map((s) => s.name);
  const stackExchangeSiteSlugs = stackExchangeSources.map((s) => s.name);

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
    se: {} as { promise?: Promise<Map<string, RawSourcePost[]>> },
    hn: {} as { promise?: Promise<RawSourcePost[]> },
    ih: {} as { promise?: Promise<RawSourcePost[]> },
    amf: {} as { promise?: Promise<RawSourcePost[]> },
  };
  const runStartedAt = Date.now();

  // Accumulates signals for any product still awaiting its one-time "your
  // first signals are ready" email (sent in the loop over this map, below
  // the main source loop) — gathered across every source of that product
  // in this run, since a
  // project can have several sources and its first-ever signals may land
  // from more than one of them in the same batch. Keyed by productId rather
  // than sent inline per-signal so the eventual email can pick the
  // highest-scoring 2-3 across the whole batch, not just whichever source
  // happened to be processed first.
  const pendingFirstSignalEmails = new Map<
    string,
    { productId: string; productName: string; userEmail: string; signals: DigestSignalItem[] }
  >();

  for (const [index, source] of sources.entries()) {
    if (Date.now() - runStartedAt > RUN_TIME_BUDGET_MS) {
      console.warn(
        `[poll] time budget reached after ${summary.sourcesPolled}/${sources.length} sources — stopping run early, the rest stay stalest-first for next run`
      );
      break;
    }

    const sourceLabel = formatSourceLabel(source.type, source.name);
    let signalsCreatedForSource = 0;
    summary.sourcesPolled += 1;
    emit({
      type: "source-start",
      name: sourceLabel,
      index: index + 1,
      total: sources.length,
    });

    let posts: RawSourcePost[];
    try {
      posts = await fetchForSource(source, caches, redditSubredditNames, stackExchangeSiteSlugs);
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
            signalsCreatedForSource += 1;
            emit({ type: "signal-created", sourceName: sourceLabel, title: post.title });

            // A project still waiting on its one-time "first signals ready"
            // email gets this signal folded into that batch instead of the
            // ongoing per-signal alert below — otherwise a brand-new
            // founder's very first scan could fire off both the welcome
            // email AND 2-3 separate "new signal" emails in the same
            // minute. Once that email has gone out (or always did, for a
            // project that predates this feature — see the migration
            // backfill), this reverts to the normal per-signal alert.
            if (!source.product.firstSignalsEmailSentAt) {
              const bucket = pendingFirstSignalEmails.get(source.product.id) ?? {
                productId: source.product.id,
                productName: source.product.name,
                userEmail: source.product.user.email,
                signals: [],
              };
              bucket.signals.push({
                title: post.title,
                sourceLabel,
                relevanceScore,
                url: `${appUrl}/projects/${source.product.id}/signals/${signal.id}`,
              });
              pendingFirstSignalEmails.set(source.product.id, bucket);
            } else {
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
          }
        } catch (error) {
          // P2002 = unique constraint on (sourceId, externalId) — a
          // concurrent poll run (cron overlapping a manual poll, or two
          // manual polls back to back) already recorded this exact post
          // for this exact source between our dedup check above and this
          // insert. Expected under concurrency, not a real failure: the
          // other run's insert is the source of truth for this post, so
          // this one just skips it rather than logging/alerting as an error.
          const isDuplicate =
            typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
          if (!isDuplicate) {
            console.error(`[poll] failed to persist scored post ${post.id} in ${source.name}`, error);
            Sentry.captureException(error, { tags: { source: source.name, postId: post.id } });
            summary.errors += 1;
          }
        }
      }
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

  for (const bucket of pendingFirstSignalEmails.values()) {
    // Conditional update as the atomic claim: if another process (a
    // concurrent cron tick, or a manual poll racing the cron) already
    // flipped this row, `count` comes back 0 and this run simply skips
    // sending — the same compare-and-swap idea as the daily scoring caps
    // above, applied to "has this email gone out yet" instead of "how much
    // has been scored today".
    const claimed = await prisma.product.updateMany({
      where: { id: bucket.productId, firstSignalsEmailSentAt: null },
      data: { firstSignalsEmailSentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const topSignals = [...bucket.signals].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);
    const { subject, html } = firstSignalsEmailTemplate({
      productName: bucket.productName,
      signals: topSignals,
      dashboardUrl: `${appUrl}/projects/${bucket.productId}/home`,
    });
    await sendEmail({ to: bucket.userEmail, subject, html });
  }

  return summary;
}
