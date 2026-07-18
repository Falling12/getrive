// One-off script to sanity-check whether Stack Exchange / Ask MetaFilter can
// ever be productive sources — not just for Getrive's own narrow "cold
// outbound for SaaS founders" positioning (which scored ~0 for both in the
// first verification pass), but for synthetic products whose ICP plausibly
// matches each source's actual culture. Creates a throwaway test user +
// products (not the real account), polls each, prints results, then deletes
// everything it created. Not part of the shipped app. Run with:
//   npx tsx -r dotenv/config scripts/test-source-fit.ts
import { prisma } from "@/lib/prisma";
import { pollAllSources } from "@/lib/reddit/poll";
import type { SourceType } from "@/generated/prisma/client";

const TEST_EMAIL = "source-fit-test@earshot.test";

interface TestProduct {
  name: string;
  description: string;
  targetCustomer: string;
  relevanceThreshold: number;
  sources: { type: SourceType; name: string }[];
}

const TEST_PRODUCTS: TestProduct[] = [
  {
    name: "DevPick",
    description:
      "DevPick helps engineering teams evaluate and choose between competing dev tools, libraries, and " +
      "SaaS vendors in minutes instead of days of scattered research — side-by-side comparisons built from " +
      "real developer discussions, docs, and pricing pages.",
    targetCustomer:
      "Developers and eng leads actively trying to decide which specific tool/library/service to use for a project.",
    relevanceThreshold: 0.5,
    sources: [
      { type: "STACKEXCHANGE", name: "softwarerecs" },
      { type: "STACKEXCHANGE", name: "superuser" },
    ],
  },
  {
    name: "ServerGuard",
    description:
      "ServerGuard is a lightweight uptime and config-drift monitor for small self-hosted infrastructure — " +
      "built for the solo sysadmin or small team running their own Linux boxes without an ops department.",
    targetCustomer: "Solo sysadmins and small teams self-hosting Linux servers, asking for tool recommendations.",
    relevanceThreshold: 0.5,
    sources: [
      { type: "STACKEXCHANGE", name: "serverfault" },
      { type: "STACKEXCHANGE", name: "askubuntu" },
    ],
  },
  {
    name: "MindfulHome",
    description:
      "MindfulHome is a journaling and life-advice app that helps people work through personal decisions — " +
      "career changes, relationship questions, big purchases — with structured reflection prompts instead " +
      "of doom-scrolling for answers.",
    targetCustomer:
      "General consumers navigating a specific personal life decision or problem, looking for thoughtful outside perspective.",
    relevanceThreshold: 0.5,
    sources: [{ type: "ASKMETAFILTER", name: "Ask MetaFilter" }],
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    create: { email: TEST_EMAIL, name: "Source Fit Test (throwaway)" },
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
          reasoning: "Source-fit test run.",
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
