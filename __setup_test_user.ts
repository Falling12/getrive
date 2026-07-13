import bcrypt from "bcryptjs";
import { prisma } from "./src/lib/prisma";

async function main() {
  const email = "loading-boundary-test@example.com";
  const password = "TestPassword123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, emailVerified: new Date() },
    create: { email, passwordHash, emailVerified: new Date(), name: "Loading Test" },
  });

  const product = await prisma.product.upsert({
    where: { id: "loading-test-product-000000000" },
    update: {},
    create: {
      id: "loading-test-product-000000000",
      userId: user.id,
      name: "Loading Test Co",
      description: "A test SaaS product for verifying loading states.",
      targetCustomer: "Test users",
      relevanceThreshold: 0.5,
    },
  });

  const source = await prisma.source.upsert({
    where: { productId_name: { productId: product.id, name: "Hacker News" } },
    update: { selected: true },
    create: {
      productId: product.id,
      type: "HACKERNEWS",
      name: "Hacker News",
      reasoning: "test",
      rank: 1,
      selected: true,
    },
  });

  await prisma.signal.upsert({
    where: { sourceId_externalId: { sourceId: source.id, externalId: "test-1" } },
    update: {},
    create: {
      sourceId: source.id,
      externalId: "test-1",
      title: "Test signal for loading state verification",
      body: "Body text",
      permalink: "https://news.ycombinator.com/item?id=1",
      author: "tester",
      relevanceScore: 0.9,
      relevanceReason: "test",
      postedAt: new Date(),
    },
  });

  console.log("Test user ready:", email, password);
  console.log("Project id:", product.id);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
