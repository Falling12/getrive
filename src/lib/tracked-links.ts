import { prisma } from "@/lib/prisma";
import type { TrackedLink, SourceType } from "@/generated/prisma/client";
import { formatSourceLabel } from "@/lib/sources/format";

export function buildTrackedUrl(
  websiteUrl: string | null,
  link: Pick<TrackedLink, "id" | "utmSource" | "utmMedium" | "utmCampaign">
): string | null {
  if (!websiteUrl) return null;

  let url: URL;
  try {
    url = new URL(websiteUrl);
  } catch {
    return null;
  }

  url.searchParams.set("utm_source", link.utmSource);
  url.searchParams.set("utm_medium", link.utmMedium);
  if (link.utmCampaign) url.searchParams.set("utm_campaign", link.utmCampaign);
  url.searchParams.set("utm_content", link.id);
  return url.toString();
}

// Every Signal gets at most one tracked link, created lazily the first time
// its detail page is viewed (rather than for every signal up front, most of
// which a founder will never reply to).
export async function getOrCreateSignalTrackedLink({
  productId,
  signalId,
  sourceType,
  sourceName,
  postTitle,
}: {
  productId: string;
  signalId: string;
  sourceType: SourceType;
  sourceName: string;
  postTitle: string;
}): Promise<TrackedLink> {
  const existing = await prisma.trackedLink.findFirst({ where: { signalId } });
  if (existing) return existing;

  return prisma.trackedLink.create({
    data: {
      productId,
      signalId,
      label: `Reply on ${formatSourceLabel(sourceType, sourceName)}: ${postTitle.slice(0, 60)}`,
      utmCampaign: sourceName,
    },
  });
}

// Every Lead gets at most one tracked link, created lazily the first time
// its detail page is viewed — mirrors getOrCreateSignalTrackedLink above,
// same reasoning (most leads never get followed up on, no point creating a
// link for every one up front).
export async function getOrCreateLeadTrackedLink({
  productId,
  leadId,
  leadName,
}: {
  productId: string;
  leadId: string;
  leadName: string;
}): Promise<TrackedLink> {
  const existing = await prisma.trackedLink.findFirst({ where: { leadId } });
  if (existing) return existing;

  return prisma.trackedLink.create({
    data: {
      productId,
      leadId,
      label: `Outreach to ${leadName}`,
      utmSource: "outreach",
      utmMedium: "dm",
      utmCampaign: leadName,
    },
  });
}
