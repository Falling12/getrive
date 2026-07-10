import { prisma } from "@/lib/prisma";

// Public, cross-origin endpoint hit by the tracking snippet running on a
// founder's own site — see /projects/[projectId]/settings for the snippet
// and lib/tracking-snippet.ts for what it sends. There's no way for Getrive
// to observe a signup on a third-party site on its own; this is the founder's
// site telling us it happened. The unique constraint on Signup.visitorToken
// makes this idempotent, so a page reload or a double-fired snippet can't
// double-count the same visitor.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const trackedLinkId = typeof body?.trackedLinkId === "string" ? body.trackedLinkId : null;
  const visitorToken = typeof body?.visitorToken === "string" ? body.visitorToken : null;

  if (!trackedLinkId || !visitorToken) {
    return Response.json(
      { error: "trackedLinkId and visitorToken are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const trackedLink = await prisma.trackedLink.findUnique({
    where: { id: trackedLinkId },
    select: { id: true, productId: true },
  });
  if (!trackedLink) {
    // Don't leak whether an id is valid — just no-op successfully.
    return Response.json({ ok: true }, { headers: CORS_HEADERS });
  }

  try {
    await prisma.signup.create({
      data: {
        productId: trackedLink.productId,
        trackedLinkId: trackedLink.id,
        visitorToken,
        source: "AUTOMATIC",
      },
    });
  } catch (error) {
    // P2002 = unique constraint on visitorToken — this exact visitor was
    // already recorded, which is expected on a snippet re-fire and not an
    // error from the caller's point of view.
    const isDuplicate =
      typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    if (!isDuplicate) throw error;
  }

  return Response.json({ ok: true }, { headers: CORS_HEADERS });
}
