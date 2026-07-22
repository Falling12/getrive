import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runMeasurementSweep, type MeasurementProgressEvent } from "@/lib/services/measurement-run.service";
import { checkRateLimit, RateLimitError } from "@/lib/rate-limit";
import { isExemptFromLimits, MANUAL_MEASUREMENT_RATE_LIMIT } from "@/lib/limits";

// Same rationale as api/poll-stream/route.ts: measurement can run for
// minutes (Reddit's rate limit — see measurement-run.service.ts), and
// Server Actions can't stream a response back incrementally. Raised from
// 300s to 800s (Vercel Pro's GA maximum) — see
// cron/measure-signals/route.ts's matching change and
// measurement-run.service.ts's RUN_TIME_BUDGET_MS.
export const maxDuration = 800;

// Same in-progress-lock staleness bound as POLL_STALE_MINUTES
// (lib/reddit/poll.ts), applied to activeMeasurementStartedAt instead of
// activePollStartedAt.
const MEASUREMENT_STALE_MINUTES = 20;

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

  // Same reasoning as api/poll-stream/route.ts's rate limit — bounds how
  // much of Reddit/Stack Exchange's shared search quota and query-generation
  // AI cost one project's impatient clicking can consume, now that this
  // trigger runs for every founder instead of just the allowlist.
  if (!isExemptFromLimits(session.user.email)) {
    try {
      await checkRateLimit(`measure:${projectId}`, MANUAL_MEASUREMENT_RATE_LIMIT);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(
          "You've measured too many times recently. Please wait a few minutes.",
          { status: 429 }
        );
      }
      throw error;
    }
  }

  if (product.activeMeasurementStartedAt) {
    const ageMinutes = (Date.now() - product.activeMeasurementStartedAt.getTime()) / 60_000;
    if (ageMinutes < MEASUREMENT_STALE_MINUTES) {
      return new Response("A measurement run is already in progress for this project", { status: 409 });
    }
  }

  await prisma.product.update({
    where: { id: product.id },
    data: { activeMeasurementStartedAt: new Date() },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: MeasurementProgressEvent | { type: "done"; summary: unknown }) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // Client is gone — the run itself keeps going regardless.
        }
      }

      try {
        const summary = await runMeasurementSweep({ productId: projectId, onProgress: send });
        send({ type: "done", summary });
      } catch (error) {
        console.error("[measure-stream] run failed", error);
        send({
          type: "done",
          summary: { productsMeasured: 0, productsSkippedNoPositioning: 0, errors: 1 },
        });
      } finally {
        await prisma.product.update({
          where: { id: product.id },
          data: { activeMeasurementStartedAt: null },
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
