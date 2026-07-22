// Read-only calibration tool for base-rate.service.ts's MEDIUM_MATCH_RATE_THRESHOLD/
// HIGH_MATCH_RATE_THRESHOLD constants. Run this AFTER the query-count-normalization,
// Reddit-throughput, and Hacker News relevance-filter changes are deployed and at
// least one real measurement sweep has run in production — otherwise it's just
// reporting the same pre-fix distribution the new metric was built to correct.
//
// Never calls classifyBaseRate/runBackfillSearchForProduct/generateAndStoreQuerySet —
// this only reads computeBaseRateMetrics's pure, no-write computation for every
// eligible product and prints the resulting matchRate distribution. Use the printed
// percentiles to hand-pick real threshold values and edit base-rate.service.ts
// directly; this script doesn't write them for you. Changing the constants doesn't
// retroactively reclassify existing products — that happens on their next scheduled
// measurement sweep.
//
// Run with: npx tsx -r dotenv/config scripts/inspect-base-rate-distribution.ts
import { prisma } from "@/lib/prisma";
import { computeBaseRateMetrics, MIN_QUERIES_FOR_CLASSIFICATION } from "@/lib/services/base-rate.service";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

async function main() {
  const products = await prisma.product.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Computing base-rate metrics for ${products.length} non-archived product(s)...\n`);

  const rows: { name: string; totalMatches: number; queriesEverRun: number; matchRate: number }[] = [];
  let belowMinimum = 0;

  for (const product of products) {
    const breakdown = await computeBaseRateMetrics(product.id);
    if (breakdown.matchRate === null || breakdown.queriesEverRun < MIN_QUERIES_FOR_CLASSIFICATION) {
      belowMinimum += 1;
      continue;
    }
    rows.push({
      name: product.name,
      totalMatches: breakdown.totalMatches,
      queriesEverRun: breakdown.queriesEverRun,
      matchRate: breakdown.matchRate,
    });
  }

  rows.sort((a, b) => b.matchRate - a.matchRate);

  console.log("=".repeat(100));
  console.log(`MATCH RATE DISTRIBUTION (${rows.length} product(s) with >= ${MIN_QUERIES_FOR_CLASSIFICATION} queries ever run)`);
  console.log("=".repeat(100));
  console.log(`${"Product".padEnd(32)} ${"matches/90d".padStart(12)} ${"queries run".padStart(12)} ${"rate".padStart(10)}`);
  for (const row of rows) {
    console.log(
      `${row.name.slice(0, 32).padEnd(32)} ${String(row.totalMatches).padStart(12)} ${String(row.queriesEverRun).padStart(12)} ${row.matchRate.toFixed(3).padStart(10)}`
    );
  }

  const rates = rows.map((r) => r.matchRate).sort((a, b) => a - b);
  console.log("\nPercentiles (matches/query):");
  for (const p of [10, 25, 50, 75, 90]) {
    console.log(`  p${p}: ${percentile(rates, p).toFixed(3)}`);
  }

  console.log(
    `\n${belowMinimum} product(s) skipped — fewer than ${MIN_QUERIES_FOR_CLASSIFICATION} queries have ever run, not enough sample to include.`
  );
  console.log(
    "\nPick MEDIUM_MATCH_RATE_THRESHOLD/HIGH_MATCH_RATE_THRESHOLD from the percentiles above (e.g. roughly p50/p80)"
  );
  console.log("and edit the constants in src/lib/services/base-rate.service.ts directly.");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
