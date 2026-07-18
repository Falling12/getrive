// One-off verification script for the Ask MetaFilter source integration —
// not part of the shipped app. Run with:
//   npx tsx -r dotenv/config scripts/verify-askmetafilter.ts
import { prisma } from "@/lib/prisma";
import { pollAllSources } from "@/lib/reddit/poll";

const SOURCE_NAME = "Ask MetaFilter";

async function main() {
  const user = await prisma.user.findFirstOrThrow({ where: { email: "senkcsani@gmail.com" } });
  const product = await prisma.product.findFirstOrThrow({
    where: { userId: user.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Using product: ${product.name} (${product.id})`);
  console.log(`Description: ${product.description}`);
  console.log(`Relevance threshold: ${product.relevanceThreshold}`);

  const existing = await prisma.source.findUnique({
    where: { productId_name: { productId: product.id, name: SOURCE_NAME } },
  });
  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: { selected: true, lastPolledAt: null, consecutiveFailures: 0, consecutiveEmptyPolls: 0 },
    });
    console.log(`Re-enabled existing Ask MetaFilter source ${existing.id}`);
  } else {
    const highestRanked = await prisma.source.findFirst({
      where: { productId: product.id },
      orderBy: { rank: "desc" },
      select: { rank: true },
    });
    const created = await prisma.source.create({
      data: {
        productId: product.id,
        type: "ASKMETAFILTER",
        name: SOURCE_NAME,
        reasoning: "Verification run.",
        rank: (highestRanked?.rank ?? -1) + 1,
        selected: true,
        karmaStatus: "READY",
      },
    });
    console.log(`Created Ask MetaFilter source ${created.id}`);
  }

  // Clear dedup so this run actually scores posts even if a prior run
  // already touched some of them.
  const source = await prisma.source.findUniqueOrThrow({
    where: { productId_name: { productId: product.id, name: SOURCE_NAME } },
  });
  const deleted = await prisma.scoredPost.deleteMany({ where: { sourceId: source.id } });
  console.log(`Cleared ${deleted.count} previously-scored posts for a clean verification run.`);

  const summary = await pollAllSources({ productId: product.id, userId: user.id });
  console.log("\n=== Poll summary ===");
  console.log(JSON.stringify(summary, null, 2));

  const scored = await prisma.scoredPost.findMany({
    where: { sourceId: source.id },
    orderBy: { relevanceScore: "desc" },
    select: { title: true, relevanceScore: true, passed: true },
  });

  console.log(`\n=== Score distribution (${scored.length} posts scored) ===`);
  for (const post of scored) {
    console.log(`${post.relevanceScore.toFixed(2)} ${post.passed ? "PASS" : "    "} — ${post.title}`);
  }

  const buckets = [0, 0, 0, 0, 0]; // 0-.2 .2-.4 .4-.6 .6-.8 .8-1
  for (const post of scored) {
    const idx = Math.min(4, Math.floor(post.relevanceScore / 0.2));
    buckets[idx]++;
  }
  console.log("\n=== Histogram ===");
  const labels = ["0.0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"];
  buckets.forEach((count, i) => console.log(`${labels[i]}: ${"#".repeat(count)} (${count})`));

  const updatedSource = await prisma.source.findUniqueOrThrow({ where: { id: source.id } });
  console.log("\n=== Source observability fields ===");
  console.log({
    lastPolledAt: updatedSource.lastPolledAt,
    lastSuccessfulPollAt: updatedSource.lastSuccessfulPollAt,
    consecutiveFailures: updatedSource.consecutiveFailures,
    consecutiveEmptyPolls: updatedSource.consecutiveEmptyPolls,
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
