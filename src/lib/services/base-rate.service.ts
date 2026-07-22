import { prisma } from "@/lib/prisma";
import { BACKFILL_WINDOW_DAYS } from "@/lib/services/backfill-search.service";
import type { BaseRateClass } from "@/generated/prisma/client";

// AGENTS.md Phase 1C — classifies a product's real base rate from its
// backfill/search matches over the trailing window, re-computed from
// SearchResult rows at call time (not from a cached count) so "trailing 90
// days" always means as-of-now, even if this runs weeks after the matches
// were originally fetched.
//
// Classification is a RATE (matches per query that has actually run), not a
// raw match count. A raw count rewards a product whose LLM-generated query
// set happened to be broader — more queries means more chances to match,
// independent of real demand. Dividing by queriesEverRun cancels that out:
// adding more queries moves the numerator and denominator together, so the
// rate only moves if the added queries are genuinely more (or less)
// productive than the existing set. This does NOT correct for one query
// being vaguer/noisier than another — that's the job of each platform's own
// relevance filter (search-reddit.ts's keyword+embedding check,
// search-stackexchange.ts's/search-hackernews.ts's embedding check), not
// this formula.
export const MIN_QUERIES_FOR_CLASSIFICATION = 6; // below this, classification stays null ("still gathering data") rather than guessing off a noisy 1-2-query sample
export const MEDIUM_MATCH_RATE_THRESHOLD = 0.5; // matches/query — PLACEHOLDER, replace with a real value from scripts/inspect-base-rate-distribution.ts once post-fix production data exists
export const HIGH_MATCH_RATE_THRESHOLD = 1.5; // matches/query — PLACEHOLDER, same

export interface VenueMatchCount {
  platform: string;
  venue: string;
  count: number;
}

export interface BaseRateBreakdown {
  productId: string;
  totalMatches: number;
  queriesEverRun: number;
  matchRate: number | null;
  classification: BaseRateClass | null;
  byPlatformVenue: VenueMatchCount[];
}

function classifyMatchRate(matchRate: number): BaseRateClass {
  if (matchRate >= HIGH_MATCH_RATE_THRESHOLD) return "HIGH";
  if (matchRate >= MEDIUM_MATCH_RATE_THRESHOLD) return "MEDIUM";
  return "LOW";
}

// Pure computation, no writes — shared by classifyBaseRate below and by
// scripts/inspect-base-rate-distribution.ts, which needs the exact same
// math read-only to calibrate MEDIUM_MATCH_RATE_THRESHOLD/
// HIGH_MATCH_RATE_THRESHOLD against real data without touching any product.
export async function computeBaseRateMetrics(productId: string): Promise<BaseRateBreakdown> {
  const sinceDate = new Date(Date.now() - BACKFILL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [grouped, queriesEverRun] = await Promise.all([
    prisma.searchResult.groupBy({
      by: ["platform", "venue"],
      where: { productId, postedAt: { gte: sinceDate } },
      _count: { _all: true },
    }),
    // No status filter: a query later auto-retired by the query-feedback
    // loop (query-feedback.service.ts) still contributed its historical
    // matches to totalMatches above, so excluding it here would inflate the
    // rate rather than correct it — this counts every query that ever
    // successfully ran, regardless of its current ACTIVE/RETIRED status.
    prisma.searchQuery.count({ where: { productId, lastSuccessfulRunAt: { not: null } } }),
  ]);

  const byPlatformVenue: VenueMatchCount[] = grouped
    .map((row) => ({ platform: row.platform, venue: row.venue, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
  const totalMatches = byPlatformVenue.reduce((sum, row) => sum + row.count, 0);
  const matchRate = queriesEverRun > 0 ? totalMatches / queriesEverRun : null;
  const classification =
    matchRate !== null && queriesEverRun >= MIN_QUERIES_FOR_CLASSIFICATION ? classifyMatchRate(matchRate) : null;

  return { productId, totalMatches, queriesEverRun, matchRate, classification, byPlatformVenue };
}

export async function classifyBaseRate(productId: string): Promise<BaseRateBreakdown> {
  const breakdown = await computeBaseRateMetrics(productId);

  // baseRateMeasuredAt/baseRateMatchCount are stamped even when
  // classification is still null, so the UI always has a fresh "last
  // measured" timestamp to show a "still gathering data" state against
  // instead of looking like measurement never ran.
  await prisma.product.update({
    where: { id: productId },
    data: {
      baseRateClass: breakdown.classification,
      baseRateMeasuredAt: new Date(),
      baseRateMatchCount: breakdown.totalMatches,
    },
  });

  return breakdown;
}
