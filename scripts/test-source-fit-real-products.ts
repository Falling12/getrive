// One-off script testing Stack Exchange / Ask MetaFilter fit against real,
// niche product descriptions pulled from production (FocusCall, iMediq,
// abs) — copied verbatim into a throwaway test user/product so this never
// touches the real accounts' data, scoring caps, or fires real notification
// emails to those founders. Not part of the shipped app. Run with:
//   npx tsx -r dotenv/config scripts/test-source-fit-real-products.ts
import { prisma } from "@/lib/prisma";
import { pollAllSources } from "@/lib/reddit/poll";
import type { SourceType } from "@/generated/prisma/client";

const TEST_EMAIL = "source-fit-test-real@earshot.test";

interface TestProduct {
  name: string;
  description: string;
  targetCustomer: string;
  relevanceThreshold: number;
  sources: { type: SourceType; name: string }[];
}

// Descriptions/targetCustomer/relevanceThreshold copied verbatim from
// products.json (real production rows) — only the productId/userId are
// fresh/throwaway, so this is a real-copy fit test, not a synthetic one.
const TEST_PRODUCTS: TestProduct[] = [
  {
    name: "FocusCall",
    description:
      "We built FocusCall, a personal assistant that calls your phone when a task is due — and keeps " +
      "calling until you pick up. Unlike notifications that get silently swiped away, a ringing phone " +
      "demands a real response, making it the reminder ADHD brains actually act on.",
    targetCustomer:
      "People with ADHD (or notification-blind brains) who consistently miss or ignore push notifications and need a more insistent way to remember tasks",
    relevanceThreshold: 0.47,
    sources: [
      { type: "STACKEXCHANGE", name: "softwarerecs" },
      { type: "ASKMETAFILTER", name: "Ask MetaFilter" },
    ],
  },
  {
    name: "iMediq",
    description:
      "We let you upload any lab PDF or photo and instantly extract every biomarker, flag what's out of " +
      "range, and explain it in plain language through a private Telegram AI assistant. We also help you " +
      "track results over time, stay on top of meds and supplements, and find nearby clinics matched to " +
      "your results — all without ads or selling your data.",
    targetCustomer:
      "Health-conscious individuals and family caregivers who get regular blood tests and want to understand their lab results without waiting for a doctor's appointment.",
    relevanceThreshold: 0.7,
    sources: [
      { type: "STACKEXCHANGE", name: "softwarerecs" },
      { type: "ASKMETAFILTER", name: "Ask MetaFilter" },
    ],
  },
  {
    name: "abs",
    description: "an app that tracks your workouts via a camera and gives you repetition specifically for ab",
    targetCustomer: "fitness people",
    relevanceThreshold: 0.7,
    sources: [
      { type: "STACKEXCHANGE", name: "softwarerecs" },
      { type: "ASKMETAFILTER", name: "Ask MetaFilter" },
    ],
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    create: { email: TEST_EMAIL, name: "Source Fit Test — real products (throwaway)" },
    update: {},
  });
  console.log(`Test user: ${user.id} (${TEST_EMAIL})\n`);

  const productIds: string[] = [];

  for (const testProduct of TEST_PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: testProduct.name,
        description: testProduct.description,
        targetCustomer: testProduct.targetCustomer,
        relevanceThreshold: testProduct.relevanceThreshold,
      },
    });
    productIds.push(product.id);

    for (const [index, src] of testProduct.sources.entries()) {
      await prisma.source.create({
        data: {
          productId: product.id,
          type: src.type,
          name: src.name,
          reasoning: "Real-product source-fit test run.",
          rank: index,
          selected: true,
          karmaStatus: "READY",
        },
      });
    }

    console.log(`=== ${testProduct.name} (threshold ${testProduct.relevanceThreshold}) ===`);
    console.log(testProduct.description);
    console.log(`Sources: ${testProduct.sources.map((s) => `${s.type}:${s.name}`).join(", ")}\n`);

    const summary = await pollAllSources({ productId: product.id, userId: user.id });
    console.log("Poll summary:", JSON.stringify(summary));

    for (const src of testProduct.sources) {
      const source = await prisma.source.findUniqueOrThrow({
        where: { productId_name: { productId: product.id, name: src.name } },
      });
      const scored = await prisma.scoredPost.findMany({
        where: { sourceId: source.id },
        orderBy: { relevanceScore: "desc" },
        select: { title: true, relevanceScore: true, passed: true },
      });

      console.log(`\n--- ${src.type}:${src.name} — ${scored.length} scored ---`);
      for (const post of scored) {
        console.log(`${post.relevanceScore.toFixed(2)} ${post.passed ? "PASS" : "    "} — ${post.title}`);
      }
      if (scored.length > 0) {
        const avg = scored.reduce((sum, p) => sum + p.relevanceScore, 0) / scored.length;
        const passed = scored.filter((p) => p.passed).length;
        console.log(`avg=${avg.toFixed(2)} passed=${passed}/${scored.length}`);
      }
    }
    console.log("\n" + "=".repeat(60) + "\n");
  }

  console.log("Cleaning up test user, products, sources, scored posts, and signals...");
  await prisma.user.delete({ where: { id: user.id } });
  console.log(`Deleted test user ${user.id} and ${productIds.length} throwaway products (cascade).`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
