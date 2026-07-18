"use client";

import { RefreshCw, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMeasureStream } from "@/lib/hooks/use-measure-stream";

// Structurally mirrors components/signals/poll-now-button.tsx, adapted to
// useMeasureStream's narrower status set (no rate-limit state — this is
// allowlist-only, low volume).
export function MeasureNowButton({
  projectId,
  initialIsActive,
}: {
  projectId: string;
  initialIsActive: boolean;
}) {
  const { status, isRunning, start } = useMeasureStream(projectId, initialIsActive);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isRunning}
        onClick={start}
        className={cn(
          "flex items-center gap-2 rounded border border-border bg-secondary/30 px-3 py-1.5 font-mono text-[13px] text-foreground transition-colors hover:bg-secondary/60",
          isRunning && "opacity-70"
        )}
      >
        <RefreshCw className={cn("size-3.5 text-accent", isRunning && "animate-spin")} />
        {isRunning ? "Measuring…" : "Measure now"}
      </button>

      {status.kind === "remote-active" && (
        <div className="flex max-w-[240px] items-center gap-2 rounded-full border border-border bg-background/80 py-1.5 pr-3 pl-2.5">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <span className="absolute inline-flex size-4 animate-ping rounded-full bg-accent/40" />
            <span className="relative flex size-1.5 rounded-full bg-accent" />
          </span>
          <span className="font-mono text-[11px] leading-snug text-muted-foreground">
            Already measuring — updates automatically
          </span>
        </div>
      )}

      {status.kind === "running" && (
        <div className="flex max-w-[280px] items-center gap-2 rounded-full border border-border bg-background/80 py-1.5 pr-3 pl-2.5">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <span className="absolute inline-flex size-4 animate-ping rounded-full bg-accent/40" />
            <span className="relative flex size-1.5 rounded-full bg-accent" />
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">{status.line}</span>
        </div>
      )}

      {status.kind === "done" && (
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Radar className="size-3" />
          <span>
            {`Measured ${status.summary.productsMeasured} product${status.summary.productsMeasured === 1 ? "" : "s"}${status.summary.productsSkippedNoPositioning ? ` · ${status.summary.productsSkippedNoPositioning} skipped (no positioning)` : ""}${status.summary.errors ? ` · ${status.summary.errors} error${status.summary.errors === 1 ? "" : "s"}` : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}
