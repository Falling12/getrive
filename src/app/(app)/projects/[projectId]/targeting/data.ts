import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isUnlimitedAccount } from "@/lib/limits";
import { getSignupsBySource } from "@/lib/attribution";
import { getVenueMiningCandidates } from "@/lib/services/venue-mining.service";
import { isPositioningStale, type IcpCandidate } from "@/lib/services/positioning.service";
import type { QueryRowData } from "@/components/search/query-management-panel";
import type { SourceRowItem } from "@/components/targeting/sources-panel";
import type { SearchIntelligenceData } from "@/components/targeting/search-intelligence-panel";

const MEASUREMENT_STALE_MINUTES = 20;
const INGESTION_STALE_MINUTES = 20;

// Everything both Targeting layouts (stacked v1, phase-rail v2) need,
// fetched once here so the two shells can't drift in what they show while
// the layout experiment is running.
export async function getTargetingData(projectId: string) {
  const session = await requireSession();
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
    include: { positioning: true },
  });

  // The search-intelligence pipeline (Phase 1/2/2C/3A) stays allowlist-only
  // (see lib/limits.ts's UNLIMITED_ACCOUNT_EMAILS) — non-allowlisted
  // founders simply don't get the section, same information boundary as the
  // old /search page's notFound(), minus the dead URL.
  const showSearchPipeline = isUnlimitedAccount(session.user.email);

  const [sources, { bySource }, queries, venueCandidates] = await Promise.all([
    prisma.source.findMany({
      where: { productId: product.id, selected: true },
      orderBy: [{ type: "asc" }, { rank: "asc" }],
    }),
    getSignupsBySource(product.id),
    showSearchPipeline
      ? prisma.searchQuery.findMany({
          where: { productId: product.id },
          orderBy: [{ platform: "asc" }, { matchCount: "desc" }],
        })
      : Promise.resolve([]),
    showSearchPipeline ? getVenueMiningCandidates(product.id) : Promise.resolve([]),
  ]);

  const positioning = product.positioning;

  const sourceRows: SourceRowItem[] = sources.map((src) => ({
    id: src.id,
    type: src.type,
    name: src.name,
    karmaThreshold: src.karmaThreshold,
    currentKarma: src.currentKarma,
    selfPromoNotes: src.selfPromoNotes,
    usersAcquired: bySource.get(src.name)?.count ?? 0,
    lastSuccessfulPollAt: src.lastSuccessfulPollAt,
    consecutiveFailures: src.consecutiveFailures,
    consecutiveEmptyPolls: src.consecutiveEmptyPolls,
  }));

  const now = Date.now();
  function toRow(q: (typeof queries)[number]): QueryRowData {
    return {
      id: q.id,
      platform: q.platform,
      text: q.text,
      variantType: q.variantType,
      matchCount: q.matchCount,
      passCount: q.passCount,
      avgMatchScore: q.avgMatchScore,
      retiredReason: q.retiredReason,
    };
  }

  const searchData: SearchIntelligenceData = {
    hasPositioning: Boolean(positioning?.selectedStatement),
    baseRateClass: product.baseRateClass,
    baseRateMatchCount: product.baseRateMatchCount,
    baseRateMeasuredAt: product.baseRateMeasuredAt,
    monthlyRate:
      product.baseRateMatchCount != null
        ? Math.round((product.baseRateMatchCount / 90) * 30)
        : null,
    lastIngestionAt: product.lastIngestionAt,
    lastIngestionMatched: product.lastIngestionMatched,
    lastIngestionScored: product.lastIngestionScored,
    lastIngestionSignals: product.lastIngestionSignals,
    lastIngestionErrors: product.lastIngestionErrors,
    isMeasuring: Boolean(
      product.activeMeasurementStartedAt &&
        now - product.activeMeasurementStartedAt.getTime() < MEASUREMENT_STALE_MINUTES * 60_000
    ),
    isIngesting: Boolean(
      product.activeIngestionStartedAt &&
        now - product.activeIngestionStartedAt.getTime() < INGESTION_STALE_MINUTES * 60_000
    ),
    active: queries.filter((q) => q.status === "ACTIVE").map(toRow),
    proposed: queries.filter((q) => q.status === "PROPOSED").map(toRow),
    retired: queries.filter((q) => q.status === "RETIRED").map(toRow),
    venueCandidates,
  };

  return {
    positioningProps: {
      projectId,
      statementCandidates: (positioning?.statementCandidates as string[] | null) ?? [],
      recommendedStatementIndex: positioning?.recommendedStatementIndex ?? 0,
      icpCandidates: (positioning?.icpCandidates as IcpCandidate[] | null) ?? [],
      recommendedIcpIndex: positioning?.recommendedIcpIndex ?? 0,
      selectedStatement: positioning?.selectedStatement ?? null,
      selectedIcpName: positioning?.selectedIcpName ?? null,
      isStale: isPositioningStale(product, positioning),
    },
    sourceRows,
    hasHackerNews: sources.some((s) => s.type === "HACKERNEWS"),
    hasIndieHackers: sources.some((s) => s.type === "INDIEHACKERS"),
    hasAskMetaFilter: sources.some((s) => s.type === "ASKMETAFILTER"),
    showSearchPipeline,
    searchData,
  };
}
