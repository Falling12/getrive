import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isUnlimitedAccount } from "@/lib/limits";

// Cheap sibling to GET /api/measure-stream: a single-column read, used by
// useMeasureStream to detect a run started by another tab without paying
// for a full page (and all its Prisma queries) via router.refresh() on
// every tick. Same in-progress-lock staleness bound as the main route.
const MEASUREMENT_STALE_MINUTES = 20;

export async function GET(request: Request) {
  const session = await requireSession();

  if (!isUnlimitedAccount(session.user.email)) {
    return new Response("Not found", { status: 404 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return new Response("Missing projectId", { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { activeMeasurementStartedAt: true },
  });
  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  const isActive = Boolean(
    product.activeMeasurementStartedAt &&
      Date.now() - product.activeMeasurementStartedAt.getTime() < MEASUREMENT_STALE_MINUTES * 60_000
  );

  return Response.json({ isActive });
}
