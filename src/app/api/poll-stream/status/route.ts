import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { POLL_STALE_MINUTES } from "@/lib/reddit/poll";

// Cheap sibling to GET /api/poll-stream: a single-column read, used by
// usePollStream to detect a poll started by another tab or the cron job
// without paying for a full page (and all its Prisma queries) via
// router.refresh() on every tick.
export async function GET(request: Request) {
  const session = await requireSession();
  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return new Response("Missing projectId", { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { activePollStartedAt: true },
  });
  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  const isActive = Boolean(
    product.activePollStartedAt &&
      Date.now() - product.activePollStartedAt.getTime() < POLL_STALE_MINUTES * 60_000
  );

  return Response.json({ isActive });
}
