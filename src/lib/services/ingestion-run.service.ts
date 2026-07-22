import { prisma } from "@/lib/prisma";
import { runSearchIngestionForProduct } from "@/lib/services/search-ingestion.service";
import { captureServerEvent } from "@/lib/analytics/posthog-server";

// Orchestrates search-mode ingestion, scoring, the query feedback loop, and
// — by producing the ScoredPost rows venue mining reads — venue mining's
// evidence, across every eligible product in one sweep. Called right after
// polling in the same invocation (see cron/poll-signals/route.ts and
// api/poll-stream/route.ts) — scoring whatever search-mode measurement has
// already backfilled is fast and has no rate limit of its own, so it
// piggybacks on poll's trigger rather than needing a separate one.
//
// Unlike measurement, ingestion has no external rate limit — Signal
// Scoring runs concurrent batches against a fast, cheap model
// (lib/ai/signal-scoring.ts) — so a single product finishes in well under
// 300s even at real volume. No time-budget early-exit is needed here the
// way it is for measurement's Reddit-throttled backfill, but products are
// still processed in a stable, least-recently-run-first order for
// consistency and so a future higher-volume future doesn't silently starve
// a product that keeps landing last.
export interface IngestionSweepSummary {
  productsIngested: number;
  errors: number;
}

export async function runIngestionSweep(options?: { productId?: string }): Promise<IngestionSweepSummary> {
  const products = await prisma.product.findMany({
    where: {
      archivedAt: null,
      searchResults: { some: {} },
      ...(options?.productId ? { id: options.productId } : {}),
    },
    select: { id: true, name: true, userId: true },
    orderBy: [
      { lastIngestionAt: { sort: "asc", nulls: "first" } },
      { createdAt: "asc" },
    ],
  });

  const summary: IngestionSweepSummary = { productsIngested: 0, errors: 0 };

  for (const product of products) {
    try {
      const result = await runSearchIngestionForProduct(product.id);

      await prisma.product.update({
        where: { id: product.id },
        data: {
          lastIngestionAt: new Date(),
          lastIngestionMatched: result.matchesEligible,
          lastIngestionFiltered: result.matchesSkippedResolved,
          lastIngestionScored: result.matchesScored,
          lastIngestionSignals: result.signalsCreated,
          lastIngestionErrors: result.errors,
        },
      });

      summary.productsIngested += 1;
      await captureServerEvent(product.userId, "search_ingestion_completed", {
        product_id: product.id,
        matched: result.matchesEligible,
        filtered: result.matchesSkippedResolved,
        scored: result.matchesScored,
        signals: result.signalsCreated,
        queries_retired: result.queriesRetired,
        errors: result.errors,
      });
    } catch (error) {
      console.error(`[ingestion-sweep] failed for product ${product.id}`, error);
      summary.errors += 1;
    }
  }

  return summary;
}
