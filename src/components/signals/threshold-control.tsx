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
      className="flex flex-col gap-2 rounded-md border border-border bg-background/60 px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="threshold"
          className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground uppercase"
        >
          <SlidersHorizontal className="size-3" />
          Relevance threshold
        </label>
        <span className="font-mono text-[11px] text-foreground">{value.toFixed(2)}</span>
      </div>

      <input
        id="threshold"
        name="threshold"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-accent"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
          Posts scoring at or above this become a signal. Lower it to see more candidates.
        </p>
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
      {state.error && <p className="font-mono text-[10px] text-destructive">{state.error}</p>}
    </form>
  );
}
