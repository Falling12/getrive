import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { TrackedLink, SourceType } from "@/generated/prisma/client";
import { formatSourceLabel } from "@/lib/sources/format";
import { SITE_URL } from "@/lib/seo";

// 6 random bytes -> 8 base64url chars. Plenty of entropy for link volumes a
// single founder generates (collisions would need millions of links before
// becoming likely), short enough to paste into a Reddit reply without it
// looking like a tracking link.
export function generateTrackedLinkSlug(): string {
  return randomBytes(6).toString("base64url");
}

// The link a founder actually copies into a reply/DM: short, no visible UTM
// params. It 302s through /r/[slug] (see that route) to the real,
// UTM-tagged destination, so attribution still works exactly as before —
// only the URL a third party sees on Reddit is short now.
export function buildTrackedUrl(
  websiteUrl: string | null,
  link: Pick<TrackedLink, "slug">
): string | null {
  if (!websiteUrl) return null;
  try {
    new URL(websiteUrl);
  } catch {
    return null;
  }
  return `${SITE_URL}/r/${link.slug}`;
}

// Appends the real UTM params to the destination site — used only by the
// /r/[slug] redirect route once it has resolved a slug to a TrackedLink,
// never shown directly to a visitor.
export function buildDestinationUrl(
  websiteUrl: string,
  link: Pick<TrackedLink, "id" | "utmSource" | "utmMedium" | "utmCampaign">
): string {
  const url = new URL(websiteUrl);
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
      slug: generateTrackedLinkSlug(),
      productId,
      signalId,
      label: `Reply on ${formatSourceLabel(sourceType, sourceName)}: ${postTitle.slice(0, 60)}`,
      utmCampaign: sourceName,
    },
  });
}
