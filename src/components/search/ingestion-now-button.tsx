"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { runIngestionNowAction } from "@/app/(app)/projects/[projectId]/search/actions";

// No streaming needed here (see ingestion-run.service.ts — no external
// rate limit, finishes well under 300s), so this is a plain pending-state
// button around a Server Action rather than an SSE-driven hook like
// MeasureNowButton.
export function IngestionNowButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await runIngestionNowAction(projectId);
            if (result.error) setError(result.error);
          })
        }
        className={cn(
          "flex items-center gap-2 rounded border border-border bg-secondary/30 px-3 py-1.5 font-mono text-[13px] text-foreground transition-colors hover:bg-secondary/60",
          isPending && "opacity-70"
        )}
      >
        <RefreshCw className={cn("size-3.5 text-accent", isPending && "animate-spin")} />
        {isPending ? "Ingesting…" : "Run ingestion now"}
      </button>
      {error && <p className="max-w-[240px] text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
