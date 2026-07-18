// AGENTS.md Phase 2A/2B/2C verification: runs search-mode ingestion
// (lib/services/search-ingestion.service.ts) against every real
// non-archived product with existing SearchResult rows, owned by an
// allowlisted account (see UNLIMITED_ACCOUNT_EMAILS in lib/limits.ts — the
// same list search-pipeline-gate.service.ts gates the whole pipeline behind),
// then prints what it did. Unlike Phase 1's backfill, this is NOT read-only
// — it creates real ScoredPost/Signal rows, sends real "new signal"
// notification emails (subject to the same daily scoring caps as normal
// polling), and mutates SearchQuery status via the query feedback loop (2C).
// Run this only when you're ready for that, not as a casual check.
//
// runSearchIngestionForProduct re-checks the gate itself (defense in
// depth), so this filter is about not wasting a run on products the
// pipeline will just no-op on anyway — it is not the enforcement point.
//
// Run with: npx tsx -r dotenv/config scripts/run-phase2-diagnostic.ts
import { prisma } from "@/lib/prisma";
import { runSearchIngestionForProduct } from "@/lib/services/search-ingestion.service";
import { UNLIMITED_ACCOUNT_EMAILS } from "@/lib/limits";

async function main() {
  const products = await prisma.product.findMany({
    where: {
      archivedAt: null,
      searchResults: { some: {} },
      user: { email: { in: [...UNLIMITED_ACCOUNT_EMAILS] } },
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Running Phase 2 search-mode ingestion for ${products.length} product(s): ${products.map((p) => p.name).join(", ")}\n`);

  for (const [index, product] of products.entries()) {
    console.log(`[${index + 1}/${products.length}] ${product.name} (${product.id})`);
    const summary = await runSearchIngestionForProduct(product.id);
    console.log(
      `  venues: ${summary.venuesProcessed}  |  eligible matches: ${summary.matchesEligible}  |  skipped (resolved/stale): ${summary.matchesSkippedResolved}`
    );
    console.log(
      `  scored: ${summary.matchesScored}  |  signals created: ${summary.signalsCreated}  |  queries retired: ${summary.queriesRetired}  |  errors: ${summary.errors}\n`
    );
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
