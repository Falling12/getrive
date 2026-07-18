import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { POLL_STALE_MINUTES } from "@/lib/reddit/poll";

// Cheap sibling to GET /api/poll-stream, used by usePollStream to detect a
// poll started by another tab or the cron job without paying for a full
// page (and all its Prisma queries) via router.refresh() on every tick.
//
// `isActive` alone isn't enough to know when to refresh: the 5-minute cron
// poll can start and finish entirely between two client polls (e.g. a
// 20s-idle-interval client checking a poll that starts and stales/stalls
// within seconds), so the client would never observe `isActive: true` and
// would never learn the run happened. `lastActivityAt` is a durable marker
// (max Source.lastPolledAt, written on every source attempt whether it
// succeeds or fails) that keeps moving forward for the whole run, so a
// client comparing it against its previously-seen value always notices a
// completed run even if it slept through the entire active window.
export async function GET(request: Request) {
  const session = await requireSession();
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return new Response("Missing projectId", { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true, activePollStartedAt: true },
  });
  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  const isActive = Boolean(
    product.activePollStartedAt &&
      Date.now() - product.activePollStartedAt.getTime() < POLL_STALE_MINUTES * 60_000
  );

  const { _max } = await prisma.source.aggregate({
    where: { productId: product.id, selected: true },
    _max: { lastPolledAt: true },
  });

  return Response.json({ isActive, lastActivityAt: _max.lastPolledAt });
}
