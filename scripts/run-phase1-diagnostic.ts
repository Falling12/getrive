// AGENTS.md Phase 1 verification gate: run query generation (1A) + backfill
// search (1B) + base-rate classification (1C) against every real
// non-archived product owned by an allowlisted account (see
// UNLIMITED_ACCOUNT_EMAILS in lib/limits.ts — the same list
// search-pipeline-gate.service.ts gates the whole pipeline behind), then
// print the diagnostic table the user has to review before Phase 2
// (search-mode ingestion) starts. Read-only w.r.t. scoring/signals — this
// never calls Signal Scoring or creates a Signal.
//
// Every service function this script calls re-checks the gate itself
// (defense in depth), so this filter is about not wasting time generating
// diagnostic output for products the pipeline will just no-op on anyway —
// it is not the enforcement point.
//
// Run with: npx tsx -r dotenv/config scripts/run-phase1-diagnostic.ts
import { prisma } from "@/lib/prisma";
import { generateAndStoreQuerySet } from "@/lib/services/query-generation.service";
import { runBackfillSearchForProduct } from "@/lib/services/backfill-search.service";
import { classifyBaseRate } from "@/lib/services/base-rate.service";
import { UNLIMITED_ACCOUNT_EMAILS } from "@/lib/limits";

async function main() {
  const products = await prisma.product.findMany({
    where: { archivedAt: null, user: { email: { in: [...UNLIMITED_ACCOUNT_EMAILS] } } },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Running Phase 1 diagnostic for ${products.length} product(s): ${products.map((p) => p.name).join(", ")}\n`);

  const rows: {
    productId: string;
    productName: string;
    totalMatches: number;
    classification: string | null;
    byPlatformVenue: { platform: string; venue: string; count: number }[];
    queryErrors: { query: string; platform: string; message: string }[];
  }[] = [];

  for (const [index, product] of products.entries()) {
    console.log(`[${index + 1}/${products.length}] ${product.name} (${product.id})`);

    console.log("  1A: generating query set...");
    await generateAndStoreQuerySet(product.id);
    const queryCount = await prisma.searchQuery.count({ where: { productId: product.id, status: "ACTIVE" } });
    console.log(`  1A: ${queryCount} active queries stored.`);

    console.log("  1B: running backfill search (this is the slow, rate-limited part)...");
    const backfill = await runBackfillSearchForProduct(product.id);
    console.log(
      `  1B: ${backfill.queriesRun}/${queryCount} queries run, ${backfill.matchesStored} matches stored, ${backfill.errors.length} errors.`
    );
    for (const err of backfill.errors) {
      console.log(`    ERROR [${err.platform}] "${err.query}": ${err.message}`);
    }

    console.log("  1C: classifying base rate...");
    const baseRate = await classifyBaseRate(product.id);
    console.log(`  1C: ${baseRate.totalMatches} matches/90d -> ${baseRate.classification}\n`);

    rows.push({
      productId: product.id,
      productName: product.name,
      totalMatches: baseRate.totalMatches,
      classification: baseRate.classification,
      byPlatformVenue: baseRate.byPlatformVenue,
      queryErrors: backfill.errors,
    });
  }

  console.log("\n" + "=".repeat(100));
  console.log("PHASE 1 DIAGNOSTIC TABLE");
  console.log("=".repeat(100));

  for (const row of rows) {
    console.log(`\n${row.productName}  (${row.productId})`);
    console.log(`  Classification: ${row.classification}  |  Total matches/90d: ${row.totalMatches}`);
    if (row.byPlatformVenue.length === 0) {
      console.log("  No matches found in any venue — genuinely rare or generation/search failed (see errors above).");
    } else {
      console.log("  Top venues:");
      for (const v of row.byPlatformVenue.slice(0, 10)) {
        console.log(`    ${v.platform.padEnd(14)} ${v.venue.padEnd(24)} ${v.count} match(es)`);
      }
    }
    if (row.queryErrors.length > 0) {
      console.log(`  ${row.queryErrors.length} query error(s) — see log above.`);
    }
  }

  console.log("\n" + "=".repeat(100));
  console.log("Done. STOP HERE per AGENTS.md build order — do not proceed to Phase 2 without review.");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
