-- AlterTable
ALTER TABLE "products" ADD COLUMN     "firstSignalsEmailSentAt" TIMESTAMP(3);

-- Backfill: any project that already has at least one signal predates this
-- feature and must never receive a retroactive "your first signals are
-- ready" email — mark it as already-sent (using that earliest signal's own
-- createdAt) so only genuinely new first-signal events email going forward.
UPDATE "products" p
SET "firstSignalsEmailSentAt" = earliest."createdAt"
FROM (
  SELECT s."productId", MIN(sig."createdAt") AS "createdAt"
  FROM "signals" sig
  JOIN "sources" s ON s.id = sig."sourceId"
  GROUP BY s."productId"
) earliest
WHERE p.id = earliest."productId";
