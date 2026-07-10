import { prisma } from "@/lib/prisma";
import { buildDestinationUrl } from "@/lib/tracked-links";

// The link a founder actually pastes into a Reddit reply or DM — see
// buildTrackedUrl in @/lib/tracked-links for why it's short instead of the
// UTM-tagged destination directly. Resolves the slug, counts the click, and
// 302s on to the real UTM-tagged URL, so the browser's final address (and
// therefore what the capture snippet in app/layout.tsx reads from
// window.location.search) is unchanged from before this redirect existed.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const link = await prisma.trackedLink.findUnique({
    where: { slug },
    select: {
      id: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      product: { select: { websiteUrl: true } },
    },
  });

  if (!link?.product.websiteUrl) {
    return new Response("Not found", { status: 404 });
  }

  await prisma.trackedLink.update({
    where: { id: link.id },
    data: { clickCount: { increment: 1 } },
  });

  return Response.redirect(buildDestinationUrl(link.product.websiteUrl, link), 302);
}
