import { prisma } from "@/lib/prisma";
import { isUnlimitedAccount } from "@/lib/limits";

// Gates the entire search-intelligence pipeline (Phase 1 measurement, Phase
// 2A/2B ingestion+scoring, Phase 2C's query feedback loop, Phase 3A venue
// mining) to accounts on the same allowlist lib/limits.ts already uses for
// unlimited/no-cost accounts — reused deliberately (see the comment on
// UNLIMITED_ACCOUNT_EMAILS) rather than a separate list, and checked via
// the raw isUnlimitedAccount predicate rather than isExemptFromLimits, so
// this gate means "this specific account" even in local/dev runs, not
// "this account, or anyone at all outside production".
//
// Called at the top of every entry point a caller could reach directly —
// query-generation.service.ts, backfill-search.service.ts,
// search-ingestion.service.ts, base-rate.service.ts, and
// venue-mining.service.ts — so a future cron tick that iterates every
// product hits the same gate these manual/script call sites do today.
// query-feedback.service.ts is deliberately NOT gated separately: every one
// of its exports is only ever reachable through search-ingestion's already-
// gated runSearchIngestionForProduct, so gating there is sufficient.
export async function assertSearchPipelineGate(
  productId: string,
  callSite: string
): Promise<{ allowed: boolean; email: string | null }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { user: { select: { email: true } } },
  });
  const email = product?.user.email ?? null;
  const allowed = isUnlimitedAccount(email);

  if (!allowed) {
    console.log(
      `[search-pipeline-gate] ${callSite}: product ${productId} (owner ${email ?? "unknown"}) is not on the allowlist — no-op.`
    );
  }

  return { allowed, email };
}
