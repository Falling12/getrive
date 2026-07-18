"use client";

import { useActionState, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  updateRelevanceThresholdAction,
  type UpdateThresholdState,
} from "@/app/(app)/projects/[projectId]/signals/actions";

export function ThresholdControl({
  projectId,
  initialThreshold,
}: {
  projectId: string;
  initialThreshold: number;
}) {
  const [state, formAction, isPending] = useActionState<UpdateThresholdState, FormData>(
    updateRelevanceThresholdAction.bind(null, projectId),
    {}
  );
  const [value, setValue] = useState(initialThreshold);
  // A successful save always echoes back the exact value this control just
  // submitted, so `dirty` naturally clears on its own next render — no
  // effect needed to resync `value` after a save lands.
  const savedValue = state.value ?? initialThreshold;
  const dirty = Math.round(value * 100) !== Math.round(savedValue * 100);

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-2 border-b border-border/60 p-5 md:px-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="threshold"
          className="flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
        >
          <SlidersHorizontal className="size-3" />
          Relevance threshold
        </label>
        <input
          id="threshold"
          name="threshold"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="min-w-[140px] flex-1 accent-accent"
        />
        <span className="shrink-0 font-mono text-[11px] text-foreground tabular-nums">{value.toFixed(2)}</span>
        {dirty && (
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-accent uppercase transition-colors hover:bg-accent/20 disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground/80">
        Posts scoring at or above this become a signal. Lower it to see more candidates.
      </p>
      {state.error && <p className="font-mono text-[10px] text-destructive">{state.error}</p>}
    </form>
  );
}
