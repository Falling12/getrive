import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { scorePosts } from "@/lib/ai/signal-scoring";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { notifySignalCreated } from "@/lib/services/notification.service";
import { sendEmail } from "@/lib/email";
import { firstSignalsEmailTemplate, type DigestSignalItem } from "@/lib/email-templates";
import { formatSourceLabel } from "@/lib/sources/format";
import { appUrl } from "@/lib/config";
import type { Product, User, Positioning, Signal, SourceType } from "@/generated/prisma/client";

// Shared by lib/reddit/poll.ts (candidates freshly fetched from a polled
// Source) and search-ingestion.service.ts (candidates from stored
// SearchResult rows) — both need the exact same "score this batch, write
// ScoredPost + Signal, notify (or bucket for the first-signal email),
// tolerate a concurrent duplicate insert" sequence. What differs between
// them — how candidates are gathered/batched against the daily scoring
// cap, and what a caller does with a scored/passed post (poll.ts's SSE
// progress events, search-ingestion's query-feedback bookkeeping) — stays
// with each caller, via the optional hooks below.

export interface ScorableCandidate {
  externalId: string;
  title: string;
  body: string;
  permalink: string;
  author: string;
  postedAt: Date;
}

export interface ScoringSource {
  id: string;
  type: SourceType;
  name: string;
}

export type ScoringProduct = Product & { user: User; positioning: Positioning | null };

export interface ScoreBatchHooks {
  // Called once per post, right after it's scored (pass or fail) — index
  // matches the input `posts` array, so a caller with a richer candidate
  // array of its own (e.g. search-ingestion's SearchResult batch, which
  // carries a queryId this shared shape doesn't know about) can look up
  // whatever extra field it needs by that same index.
  onScored?: (index: number, relevanceScore: number, passed: boolean) => void | Promise<void>;
  // Called only when a post passes and its Signal row is committed.
  onSignalCreated?: (index: number, signal: Signal) => void | Promise<void>;
}

export interface ScoreBatchResult {
  scored: number;
  signalsCreated: number;
  errors: number;
}

export interface PendingFirstSignalBucket {
  productId: string;
  productName: string;
  userEmail: string;
  signals: DigestSignalItem[];
}

// A project still waiting on its one-time "your first signals are ready"
// retention email gets this signal folded into that batch instead of the
// ongoing per-signal alert — otherwise a brand-new founder's very first
// scan (whether that's a poll or a search-mode ingestion run) could fire
// off both the welcome email AND a separate "new signal" email in the same
// minute. Once that email has gone out (or always did, for a product that
// predates this feature — see the migration backfill), this falls through
// to the normal per-signal alert. `pending` is caller-owned: poll.ts
// accumulates one across an entire multi-source run, search-ingestion
// accumulates one across a single product's venues, and each flushes its
// own via flushPendingFirstSignalEmails below.
async function notifyOrBucketFirstSignal(
  product: ScoringProduct,
  source: ScoringSource,
  signal: Signal,
  post: ScorableCandidate,
  pending: Map<string, PendingFirstSignalBucket>
): Promise<void> {
  if (!product.firstSignalsEmailSentAt) {
    const bucket = pending.get(product.id) ?? {
      productId: product.id,
      productName: product.name,
      userEmail: product.user.email,
      signals: [],
    };
    bucket.signals.push({
      title: post.title,
      sourceLabel: formatSourceLabel(source.type, source.name),
      relevanceScore: signal.relevanceScore,
      url: `${appUrl}/projects/${product.id}/signals/${signal.id}`,
    });
    pending.set(product.id, bucket);
    return;
  }

  await notifySignalCreated({
    userEmail: product.user.email,
    notifyNewSignal: product.user.notifyNewSignal,
    productId: product.id,
    productName: product.name,
    sourceType: source.type,
    sourceName: source.name,
    signalId: signal.id,
    title: post.title,
    body: post.body,
  });
}

// Call once, after all scoring for a run is done. The conditional update is
// the atomic claim: if another process (a concurrent cron tick, or a
// manual run racing this one) already flipped this row, `count` comes back
// 0 and this run simply skips sending — the other run's claim is the
// source of truth.
export async function flushPendingFirstSignalEmails(pending: Map<string, PendingFirstSignalBucket>): Promise<void> {
  for (const bucket of pending.values()) {
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
}

export async function scoreBatchAndCreateSignals(
  source: ScoringSource,
  product: ScoringProduct,
  posts: ScorableCandidate[],
  // Tags every ScoredPost this batch creates so poll.ts and
  // search-ingestion.service.ts can each count only their own daily
  // scoring-cap usage (see limits.ts's DAILY_SCORING_CAP_PER_PROJECT_POLL/
  // _SEARCH) instead of racing for one shared pool.
  viaSearch: boolean,
  pendingFirstSignalEmails: Map<string, PendingFirstSignalBucket>,
  hooks?: ScoreBatchHooks
): Promise<ScoreBatchResult> {
  const result: ScoreBatchResult = { scored: 0, signalsCreated: 0, errors: 0 };
  if (posts.length === 0) return result;

  let scores;
  try {
    scores = await scorePosts({
      productDescription: product.description,
      sourceType: source.type,
      sourceName: source.name,
      posts: posts.map((post) => ({ postTitle: post.title, postBody: post.body })),
      icpContext: describeSelectedIcp(product.positioning),
    });
  } catch (error) {
    // The whole batch failed together (network/parsing error) — none of
    // these posts got a ScoredPost row, so they're simply still unscored
    // next run (same fault-tolerance as a single post failing before).
    console.error(`[scoring-pipeline] failed to score a batch of ${posts.length} posts in ${source.name}`, error);
    Sentry.captureException(error, { tags: { source: source.name, sourceType: source.type } });
    result.errors = posts.length;
    return result;
  }
  result.scored = scores.length;

  for (const [index, post] of posts.entries()) {
    try {
      const { relevanceScore, reason } = scores[index];
      const passed = relevanceScore >= product.relevanceThreshold;
      await hooks?.onScored?.(index, relevanceScore, passed);

      await prisma.scoredPost.create({
        data: {
          sourceId: source.id,
          externalId: post.externalId,
          title: post.title,
          permalink: post.permalink,
          relevanceScore,
          passed,
          viaSearch,
        },
      });

      if (passed) {
        const signal = await prisma.signal.create({
          data: {
            sourceId: source.id,
            externalId: post.externalId,
            title: post.title,
            body: post.body,
            permalink: post.permalink,
            author: post.author,
            relevanceScore,
            relevanceReason: reason,
            postedAt: post.postedAt,
          },
        });
        result.signalsCreated += 1;
        await notifyOrBucketFirstSignal(product, source, signal, post, pendingFirstSignalEmails);
        await hooks?.onSignalCreated?.(index, signal);
      }
    } catch (error) {
      // P2002 = unique constraint on (sourceId, externalId) — a concurrent
      // run (cron overlapping a manual trigger, two manual triggers back to
      // back, or poll and search-ingestion both landing the same post for
      // the same source) already recorded this exact post for this exact
      // source between the dedup check and this insert. Expected under
      // concurrency, not a real failure: the other run's insert is the
      // source of truth for this post, so this one just skips it.
      const isDuplicate =
        typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
      if (!isDuplicate) {
        console.error(`[scoring-pipeline] failed to persist scored post ${post.externalId} in ${source.name}`, error);
        Sentry.captureException(error, { tags: { source: source.name, postId: post.externalId } });
        result.errors += 1;
      }
    }
  }

  return result;
}
