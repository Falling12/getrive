import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { runMeasurementSweep, type MeasurementProgressEvent } from "@/lib/services/measurement-run.service";
import { isUnlimitedAccount } from "@/lib/limits";

// Same rationale as api/poll-stream/route.ts: measurement can run for
// minutes (Reddit's rate limit — see measurement-run.service.ts), and
// Server Actions can't stream a response back incrementally.
export const maxDuration = 300;

// Same in-progress-lock staleness bound as POLL_STALE_MINUTES
// (lib/reddit/poll.ts), applied to activeMeasurementStartedAt instead of
// activePollStartedAt.
const MEASUREMENT_STALE_MINUTES = 20;

export async function GET(request: Request) {
  const session = await requireSession();

  // This route is reachable by any logged-in user's browser, not just
  // allowlisted ones — unlike the service-layer gate (which returns an
  // empty/no-op result), a non-allowlisted caller hitting this endpoint
  // directly gets a real 403, since there's no legitimate reason for their
  // own browser to be calling it at all (the UI that would call it is
  // itself allowlist-gated — see app/(app)/projects/[projectId]/search/page.tsx).
  if (!isUnlimitedAccount(session.user.email)) {
    return new Response("Not found", { status: 404 });
  }

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
