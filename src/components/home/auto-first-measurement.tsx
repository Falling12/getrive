"use client";

import { useEffect } from "react";
import { useMeasureStream } from "@/lib/hooks/use-measure-stream";

// Auto-triggers this product's first measurement run (query generation +
// backfill search + base-rate classification) right after onboarding — the
// same durable, DB-derived, self-clearing trigger shape as AutoFirstScan
// uses for polling (needsFirstMeasurement, computed in home/page.tsx: true
// exactly until this product has ever been measured, then never again).
// No visible progress here, unlike AutoFirstScan — Targeting's existing
// Measure-now UI already shows live/remote-active status the moment a
// founder visits it while this run is still going, so there's no separate
// banner to maintain, and no reappearing-banner bug class to guard against.
export function AutoFirstMeasurement({
  projectId,
  initialIsActive,
  needsFirstMeasurement,
}: {
  projectId: string;
  initialIsActive: boolean;
  needsFirstMeasurement: boolean;
}) {
  const { start } = useMeasureStream(projectId, initialIsActive);

  useEffect(() => {
    if (!needsFirstMeasurement || initialIsActive) return;
    start();
  }, [needsFirstMeasurement, initialIsActive, start]);

  return null;
}
