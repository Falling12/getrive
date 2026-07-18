import { prisma } from "@/lib/prisma";
import { BACKFILL_WINDOW_DAYS } from "@/lib/services/backfill-search.service";
import { assertSearchPipelineGate } from "@/lib/services/search-pipeline-gate.service";
import type { BaseRateClass } from "@/generated/prisma/client";

// AGENTS.md Phase 1C — classifies a product's real base rate from its
// backfill/search matches over the trailing window, re-computed from
// SearchResult rows at call time (not from a cached count) so "trailing 90
// days" always means as-of-now, even if this runs weeks after the matches
// were originally fetched (see the monthly re-measurement note on Product).
export const HIGH_BASE_RATE_THRESHOLD = 30; // matches/90d

export interface VenueMatchCount {
  platform: string;
  venue: string;
  count: number;
}

export interface BaseRateBreakdown {
  productId: string;
  totalMatches: number;
  classification: BaseRateClass;
  byPlatformVenue: VenueMatchCount[];
}

export async function classifyBaseRate(productId: string): Promise<BaseRateBreakdown> {
  const { allowed } = await assertSearchPipelineGate(productId, "base-rate");
  if (!allowed) return { productId, totalMatches: 0, classification: "LOW", byPlatformVenue: [] };

  const sinceDate = new Date(Date.now() - BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const grouped = await prisma.searchResult.groupBy({
    by: ["platform", "venue"],
    where: { productId, postedAt: { gte: sinceDate } },
    _count: { _all: true },
  });

  const byPlatformVenue: VenueMatchCount[] = grouped
    .map((row) => ({ platform: row.platform, venue: row.venue, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const totalMatches = byPlatformVenue.reduce((sum, row) => sum + row.count, 0);
  const classification: BaseRateClass = totalMatches >= HIGH_BASE_RATE_THRESHOLD ? "HIGH" : "LOW";

  await prisma.product.update({
    where: { id: productId },
    data: {
      baseRateClass: classification,
      baseRateMeasuredAt: new Date(),
      baseRateMatchCount: totalMatches,
    },
  });

  return { productId, totalMatches, classification, byPlatformVenue };
}
