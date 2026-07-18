import { prisma } from "@/lib/prisma";
import { generateAndStoreQuerySet } from "@/lib/services/query-generation.service";
import { runBackfillSearchForProduct } from "@/lib/services/backfill-search.service";
import { classifyBaseRate } from "@/lib/services/base-rate.service";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { UNLIMITED_ACCOUNT_EMAILS } from "@/lib/limits";

// Orchestrates AGENTS.md Phase 1 (query generation + backfill search +
// base-rate classification) across every eligible product in one sweep —
// the cron/on-demand-stream counterpart to lib/reddit/poll.ts's
// pollAllSources, mirroring its shape: stalest-first ordering so a sweep
// interrupted by the time budget below naturally resumes where it left off
// next run, and a per-product try/catch so one product's failure doesn't
// abort the rest.
//
// Every product this sweep touches still passes through
// generateAndStoreQuerySet/runBackfillSearchForProduct/classifyBaseRate's
// own assertSearchPipelineGate check — the allowlist filter below is about
// not wasting a Reddit-throttled run on products the gate would just
// no-op anyway, it is not the enforcement point.
//
// Reddit's real ~75s/query throttle (backfill-search.service.ts) means a
// single product with several Reddit queries can exceed this budget (and
// even Vercel's 300s maxDuration) on its own — that's an accepted
// limitation of running a rate-limited external fetch inside one function
// invocation, not something this sweep tries to checkpoint mid-product.
// Vercel's own hard timeout is the safety net: everything already written
// (query upserts, SearchResult upserts) is idempotent, so a mid-product
// kill just means that product's baseRateMeasuredAt isn't updated this
// run, which keeps it stalest-first (and tried again first) next time.
const RUN_TIME_BUDGET_MS = 270_000;

// Hard ceiling on how long a single product's backfill (the sequential,
// Reddit-throttled leg — see backfill-search.service.ts) gets before this
// sweep stops starting new queries for it and moves on. Deliberately well
// under RUN_TIME_BUDGET_MS/maxDuration, not derived from either: a product
// sitting at or near MAX_ACTIVE_QUERIES_PER_PLATFORM Reddit queries would
// otherwise take up to ~19 minutes (15 queries * ~75s) to finish on its
// own, which the 300s route ceiling can't accommodate regardless of how
// many other products are in the sweep — Vercel kills the function outright
// mid-run, skipping classifyBaseRate (so baseRateMeasuredAt never updates)
// and the route's own cleanup/`done` event (so the client-side stream looks
// stuck — see use-measure-stream.ts). Capping backfill's own wall time
// guarantees classifyBaseRate and the `done` event are always reached;
// backfill-search.service.ts's stalest-lastRunAt-first ordering means a
// product with more queries than fit in one budget just rotates through the
// rest on its next measurement run instead of never finishing this one.
const PER_PRODUCT_BACKFILL_BUDGET_MS = 150_000;

export type MeasurementProgressEvent =
  | { type: "product-start"; name: string; index: number; total: number }
  | { type: "product-done"; name: string; totalMatches: number; classification: string }
  | { type: "product-error"; name: string; message: string };

export interface MeasurementSweepSummary {
  productsMeasured: number;
  productsSkippedNoPositioning: number;
  errors: number;
}

export async function runMeasurementSweep(options?: {
  productId?: string;
  onProgress?: (event: MeasurementProgressEvent) => void;
}): Promise<MeasurementSweepSummary> {
  const emit = options?.onProgress ?? (() => {});
  const allowlistedEmails = [...UNLIMITED_ACCOUNT_EMAILS];

  const baseWhere = {
    archivedAt: null,
    user: { email: { in: allowlistedEmails } },
    ...(options?.productId ? { id: options.productId } : {}),
  };

  // Positioning drives query generation's prompt (query-generation.ts) —
  // a product with none yet can't be measured meaningfully. Skipped with a
  // log line per product, not an error, since this is an expected state
  // for a product still mid-onboarding, not a failure.
  const [products, skippedProducts] = await Promise.all([
    prisma.product.findMany({
      where: { ...baseWhere, positioning: { selectedStatement: { not: null } } },
      select: { id: true, name: true, userId: true },
      orderBy: [
        { baseRateMeasuredAt: { sort: "asc", nulls: "first" } },
        { createdAt: "asc" },
      ],
    }),
    prisma.product.findMany({
      where: {
        ...baseWhere,
        OR: [{ positioning: null }, { positioning: { selectedStatement: null } }],
      },
      select: { id: true, name: true },
    }),
  ]);

  for (const skipped of skippedProducts) {
    console.log(`[measurement-sweep] skipping ${skipped.name} (${skipped.id}) — no Positioning set yet.`);
  }

  const summary: MeasurementSweepSummary = {
    productsMeasured: 0,
    productsSkippedNoPositioning: skippedProducts.length,
    errors: 0,
  };
  const runStartedAt = Date.now();

  for (const [index, product] of products.entries()) {
    if (Date.now() - runStartedAt > RUN_TIME_BUDGET_MS) {
      console.warn(
        `[measurement-sweep] time budget reached after ${summary.productsMeasured}/${products.length} products — stopping early, the rest stay stalest-first for next run`
      );
      break;
    }

    emit({ type: "product-start", name: product.name, index: index + 1, total: products.length });
    try {
      await generateAndStoreQuerySet(product.id);
      await runBackfillSearchForProduct(product.id, { deadline: Date.now() + PER_PRODUCT_BACKFILL_BUDGET_MS });
      const baseRate = await classifyBaseRate(product.id);
      summary.productsMeasured += 1;
      emit({
        type: "product-done",
        name: product.name,
        totalMatches: baseRate.totalMatches,
        classification: baseRate.classification,
      });
      await captureServerEvent(product.userId, "search_measurement_completed", {
        product_id: product.id,
        total_matches: baseRate.totalMatches,
        classification: baseRate.classification,
      });
    } catch (error) {
      console.error(`[measurement-sweep] failed for product ${product.id}`, error);
      summary.errors += 1;
      emit({
        type: "product-error",
        name: product.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}
