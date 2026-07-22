import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { pollAllSources, POLL_STALE_MINUTES, type PollProgressEvent } from "@/lib/reddit/poll";
import { runIngestionSweep } from "@/lib/services/ingestion-run.service";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { isExemptFromLimits, MANUAL_POLL_RATE_LIMIT } from "@/lib/limits";

// Reddit's rate limit forces spacing between subreddits in a batch (see
// lib/reddit/poll.ts) — a few minutes of wall-clock time per run.
// Search-mode ingestion (chained after polling completes, below) adds
// little to this — it has no external rate limit of its own.
export const maxDuration = 300;

// Streams live progress from a manual "Check for new posts" run as
// Server-Sent Events, instead of the founder staring at a static "please
// wait" message for up to ~2 minutes. Server Actions can't stream a
// response back incrementally, so this is a plain Route Handler instead.
export async function GET(request: Request) {
  const session = await requireSession();
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return new Response("Missing projectId", { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  // Separate from the login rate limiter — this is about bounding how much
  // of the shared Reddit rate limit and Signal Scoring's AI cost one
  // project's impatient clicking can consume, not about auth abuse.
  if (!isExemptFromLimits(session.user.email)) {
    try {
      await checkRateLimit(`poll:${projectId}`, MANUAL_POLL_RATE_LIMIT);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(
          "You've checked for new posts too many times recently. Please wait a few minutes.",
          { status: 429 }
        );
      }
      throw error;
    }
  }

  // Refuse a second concurrent run for the same project (double-click,
  // a second tab, or a refresh that re-triggered the button) — the poll
  // keeps running server-side regardless of whether the original client is
  // still connected, so a fresh click here would just contend for the same
  // shared, per-IP Reddit rate limit.
  if (product.activePollStartedAt) {
    const ageMinutes = (Date.now() - product.activePollStartedAt.getTime()) / 60_000;
    if (ageMinutes < POLL_STALE_MINUTES) {
      return new Response("A check is already in progress for this project", { status: 409 });
    }
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { activePollStartedAt: new Date() },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // The client may disconnect (page refresh/navigation) well before the
      // poll itself finishes — enqueuing to a closed stream throws, but that
      // must never skip the `finally` below that clears the active-poll flag.
      function send(event: PollProgressEvent | { type: "done"; summary: unknown }) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client is gone — the poll itself keeps running regardless.
        }
      }

      try {
        const summary = await pollAllSources({
          productId: projectId,
          onProgress: send,
        });
        send({ type: "done", summary });
        // Scores whatever search-mode measurement has already backfilled
        // for this project — fast, no external rate limit, so it
        // piggybacks on the same "check for new posts" click instead of
        // needing its own trigger. Its own failure shouldn't affect the
        // poll result already sent above, so it gets its own try/catch.
        try {
          await runIngestionSweep({ productId: projectId });
        } catch (error) {
          console.error("[poll-stream] chained ingestion failed", error);
        }
      } catch (error) {
        console.error("[poll-stream] run failed", error);
        send({
          type: "done",
          summary: { sourcesPolled: 0, postsFetched: 0, postsScored: 0, signalsCreated: 0, errors: 1 },
        });
      } finally {
        await prisma.product.update({
          where: { id: product.id },
          data: { activePollStartedAt: null },
        });
        try {
          controller.close();
        } catch {
          // Already closed by the client disconnecting — fine.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
