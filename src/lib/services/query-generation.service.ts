import { prisma } from "@/lib/prisma";
import { generateQuerySet, type QueryItem } from "@/lib/ai/query-generation";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import type { SearchPlatform } from "@/generated/prisma/client";

// AGENTS.md Phase 1A. Generates a product's QuerySet via the LLM and
// upserts it as SearchQuery rows — upsert (not create) so re-running this
// for a product (monthly base-rate re-measurement) is idempotent: an
// existing (productId, platform, text) row keeps its accumulated stats
// (matchCount/passCount/avgMatchScore) instead of being duplicated or reset.
export async function generateAndStoreQuerySet(productId: string): Promise<void> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { positioning: true },
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

  for (const { platform, item } of rows) {
    await prisma.searchQuery.upsert({
      where: { productId_platform_text: { productId, platform, text: item.text } },
      create: {
        productId,
        platform,
        text: item.text,
        variantType: item.variantType,
      },
      // Re-generation can propose the same text again with a different
      // variantType classification — update that, but never touch status/
      // stats here, those belong to the query feedback loop (Phase 2C), not
      // generation.
      update: {
        variantType: item.variantType,
      },
    });
  }
}
