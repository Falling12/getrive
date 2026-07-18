import { prisma } from "@/lib/prisma";
import { significantWords } from "@/lib/reddit/search-reddit";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import type { SearchPlatform } from "@/generated/prisma/client";

// AGENTS.md Phase 2C — the query feedback loop referenced throughout Phase
// 1A/1B/2A's comments (lib/services/query-generation.service.ts,
// lib/services/backfill-search.service.ts, the SearchQuery/QueryStatus
// schema comments): judges each SearchQuery on its lifetime performance
// (matchCount/passCount/avgMatchScore, updated here and in
// backfill-search.service.ts's storeMatches), retires the ones that
// consistently find nothing worth a founder's time, and proposes new query
// candidates mined from real passing signals' own language instead of
// another round of LLM guessing.

// Recorded once per SearchResult scored, from search-ingestion.service.ts.
// Multiple queries can find the same post (SearchResult's unique constraint
// is on productId+platform+venue+externalId, not queryId — see
// backfill-search.service.ts's storeMatches) but only the query that
// originally stored the row is credited, matching that same "first query to
// find it wins" ownership.
//
// avgMatchScore is a running average weighted by matchCount rather than an
// exact mean over a separately-tracked scored-count — consistent with base
// rate classification elsewhere in this pipeline treating match volume as a
// coarse signal, not something requiring exact precision. Concurrent
// scoring batches (search-ingestion.service.ts runs several at once) can
// race on this read-modify-write for two matches from the same query
// landing in different concurrent batches; acceptable imprecision for a
// coarse average, not worth a raw-SQL atomic update.
export async function recordQueryOutcome(
  queryId: string,
  relevanceScore: number,
  passed: boolean
): Promise<void> {
  const query = await prisma.searchQuery.findUnique({
    where: { id: queryId },
    select: { avgMatchScore: true, matchCount: true },
  });
  if (!query) return;

  const scoredSoFar = Math.max(query.matchCount, 1);
  const previousAvg = query.avgMatchScore ?? relevanceScore;
  const newAvg = previousAvg + (relevanceScore - previousAvg) / scoredSoFar;

  await prisma.searchQuery.update({
    where: { id: queryId },
    data: {
      ...(passed ? { passCount: { increment: 1 } } : {}),
      avgMatchScore: newAvg,
    },
  });
}

// A query judged only after it's had a real chance to prove itself — a
// 2-match sample scoring 0 tells you almost nothing, but 8+ matches with
// zero passes and a near-zero average is a query that isn't finding real
// signal, just noise, and is costing real Reddit-throttled request budget
// (or Stack Exchange quota) on every future backfill run for nothing.
const RETIREMENT_MIN_MATCHES = 8;
const RETIREMENT_MAX_AVG_SCORE = 0.15;

export async function retireUnderperformingQueries(productId: string, userId: string): Promise<number> {
  // updateMany doesn't report which rows it touched, and the retirement
  // event is meant to be reviewable per-query (query text, not just a
  // count) — so the matching set is read first, then updated, then
  // reported, rather than trying to derive it from the bulk update result.
  const candidates = await prisma.searchQuery.findMany({
    where: {
      productId,
      status: "ACTIVE",
      matchCount: { gte: RETIREMENT_MIN_MATCHES },
      passCount: 0,
      avgMatchScore: { lte: RETIREMENT_MAX_AVG_SCORE },
    },
    select: { id: true, text: true, platform: true },
  });
  if (candidates.length === 0) return 0;

  const retiredReason = `Auto-retired by the query feedback loop: ${RETIREMENT_MIN_MATCHES}+ matches found, 0 passed Signal Scoring, avg relevance <= ${RETIREMENT_MAX_AVG_SCORE}.`;
  await prisma.searchQuery.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { status: "RETIRED", retiredReason },
  });

  for (const candidate of candidates) {
    await captureServerEvent(userId, "search_query_retired", {
      product_id: productId,
      query_id: candidate.id,
      platform: candidate.platform,
      text: candidate.text,
      reason: "underperforming",
    });
  }

  return candidates.length;
}

// New ACTIVE queries stay bounded even as the feedback loop keeps proposing
// more — a product that's found a lot of passing signals shouldn't end up
// running dozens of near-duplicate queries every backfill pass. Once a
// platform is at the cap, further proposals land as PROPOSED (human-visible
// per the QueryStatus schema comment, not run until approved) instead of
// silently expanding what gets searched.
export const MAX_ACTIVE_QUERIES_PER_PLATFORM = 15;
// Below this many significant words, a mined phrase is too thin to be a
// useful search query (matches query-generation.ts's own "3-6 keywords" — a
// 1-2 word phrase is either a single common word, near-zero-signal per
// query-generation.ts's own warning, or too specific to this one post to
// generalize).
const MIN_PHRASE_WORDS = 3;
const MAX_PHRASE_WORDS = 6;

function deriveQueryTextFromTitle(title: string): string | null {
  const words = significantWords(title).slice(0, MAX_PHRASE_WORDS);
  return words.length >= MIN_PHRASE_WORDS ? words.join(" ") : null;
}

// Called from search-ingestion.service.ts right after a match passes Signal
// Scoring — mines the real post's own title for a candidate phrase rather
// than asking an LLM to guess again, on the theory that a real person who
// already has this exact pain point phrased it better than a model could.
// Checks for an existing row explicitly (rather than a plain upsert) so a
// phrase that already exists (ACTIVE, PROPOSED, or even RETIRED) is left
// untouched — never resurrected/duplicated — and so the caller can tell a
// genuinely new proposal apart from a no-op, which the
// search_query_variant_proposed event needs.
export async function proposeQueryFromPassingMatch({
  productId,
  userId,
  platform,
  title,
}: {
  productId: string;
  userId: string;
  platform: SearchPlatform;
  title: string;
}): Promise<void> {
  const text = deriveQueryTextFromTitle(title);
  if (!text) return;

  const existing = await prisma.searchQuery.findUnique({
    where: { productId_platform_text: { productId, platform, text } },
    select: { id: true },
  });
  if (existing) return;

  const activeCount = await prisma.searchQuery.count({
    where: { productId, platform, status: "ACTIVE" },
  });
  const status = activeCount < MAX_ACTIVE_QUERIES_PER_PLATFORM ? "ACTIVE" : "PROPOSED";

  let created;
  try {
    created = await prisma.searchQuery.create({
      data: { productId, platform, text, variantType: "COLLOQUIAL", status },
    });
  } catch (error) {
    // P2002 = unique constraint on (productId, platform, text) — two
    // concurrent scoring batches (search-ingestion.service.ts runs several
    // at once) derived the same phrase from two different passing matches
    // and both passed the findUnique check above before either created.
    // The other create is the real row now; this one is simply a no-op.
    const isDuplicate =
      typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
    if (isDuplicate) return;
    throw error;
  }

  await captureServerEvent(userId, "search_query_variant_proposed", {
    product_id: productId,
    query_id: created.id,
    platform,
    text,
    status,
    auto_activated: status === "ACTIVE",
  });
}
