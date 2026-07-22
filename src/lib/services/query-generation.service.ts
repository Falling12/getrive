import { prisma } from "@/lib/prisma";
import { generateQuerySet, type QueryItem } from "@/lib/ai/query-generation";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { MAX_ACTIVE_QUERIES_PER_PLATFORM } from "@/lib/services/query-feedback.service";
import { isExemptFromLimits } from "@/lib/limits";
import type { SearchPlatform } from "@/generated/prisma/client";

// AGENTS.md Phase 1A. Generates a product's QuerySet via the LLM and
// upserts it as SearchQuery rows — upsert (not create) so re-running this
// for a product (re-measurement) is idempotent: an existing (productId,
// platform, text) row keeps its accumulated stats (matchCount/passCount/
// avgMatchScore) instead of being duplicated or reset.
//
// The LLM call has no memory of a product's existing query set (it's asked
// cold every time, temperature 0.5), so a repeat call — every measurement
// sweep that reaches this product, every manual "Scan for signals" click —
// mostly proposes fresh phrasings rather than re-deriving the same text the
// upsert above could dedupe on. Left unbounded, that meant every re-run
// just kept adding new ACTIVE queries with no ceiling, unlike
// query-feedback.service.ts's proposeQueryFromPassingMatch, which already
// caps ACTIVE creation at MAX_ACTIVE_QUERIES_PER_PLATFORM and routes the
// overflow to PROPOSED for manual review. This mirrors that same cap here
// so both of a product's query-creation paths agree on what counts as
// "enough" active queries for one platform.
export async function generateAndStoreQuerySet(productId: string): Promise<void> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { positioning: true, user: { select: { email: true } } },
  });

  const querySet = await generateQuerySet({
    productName: product.name,
    description: product.description,
    icpContext: describeSelectedIcp(product.positioning),
  });

  const rows: { platform: SearchPlatform; item: QueryItem }[] = [
    ...querySet.redditQueries.map((item) => ({ platform: "REDDIT" as const, item })),
    ...querySet.stackExchangeQueries.map((item) => ({ platform: "STACKEXCHANGE" as const, item })),
    ...querySet.hackerNewsQueries.map((item) => ({ platform: "HACKERNEWS" as const, item })),
  ];

  const exempt = isExemptFromLimits(product.user.email);
  // Seeded once per platform from the current DB count, then tracked
  // locally as this loop creates rows — a fresh per-item DB count would
  // race against creates from earlier iterations in the same call.
  const activeCounts = new Map<SearchPlatform, number>();
  for (const platform of ["REDDIT", "STACKEXCHANGE", "HACKERNEWS"] as const) {
    activeCounts.set(platform, await prisma.searchQuery.count({ where: { productId, platform, status: "ACTIVE" } }));
  }

  for (const { platform, item } of rows) {
    const existing = await prisma.searchQuery.findUnique({
      where: { productId_platform_text: { productId, platform, text: item.text } },
      select: { id: true },
    });

    if (existing) {
      // Re-generation can propose the same text again with a different
      // variantType classification — update that, but never touch status/
      // stats here, those belong to the query feedback loop (Phase 2C), not
      // generation.
      await prisma.searchQuery.update({ where: { id: existing.id }, data: { variantType: item.variantType } });
      continue;
    }

    const currentActive = activeCounts.get(platform) ?? 0;
    const status = exempt || currentActive < MAX_ACTIVE_QUERIES_PER_PLATFORM ? "ACTIVE" : "PROPOSED";
    if (status === "ACTIVE") activeCounts.set(platform, currentActive + 1);

    await prisma.searchQuery.create({
      data: { productId, platform, text: item.text, variantType: item.variantType, status },
    });
  }
}
