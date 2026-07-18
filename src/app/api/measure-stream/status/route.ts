import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isUnlimitedAccount } from "@/lib/limits";

// Cheap sibling to GET /api/measure-stream, used by useMeasureStream to
// detect a run started by another tab without paying for a full page (and
// all its Prisma queries) via router.refresh() on every tick. Same
// in-progress-lock staleness bound as the main route.
//
// `isActive` alone can miss a run that starts and finishes entirely
// between two client polls, so `lastActivityAt` (Product.baseRateMeasuredAt,
// written once at the end of a successful run) gives the client a durable
// marker to compare against its previously-seen value — that way a
// completed run is never silently missed just because the client didn't
// happen to catch it mid-flight.
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
    select: { activeMeasurementStartedAt: true, baseRateMeasuredAt: true },
  });
  if (!product) {
    return new Response("Not found", { status: 404 });
  }

  const isActive = Boolean(
    product.activeMeasurementStartedAt &&
      Date.now() - product.activeMeasurementStartedAt.getTime() < MEASUREMENT_STALE_MINUTES * 60_000
  );

  return Response.json({ isActive, lastActivityAt: product.baseRateMeasuredAt });
}
