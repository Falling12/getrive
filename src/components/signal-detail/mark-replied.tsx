"use client";

import { useActionState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { markAsRepliedAction } from "@/app/(app)/projects/[projectId]/signals/[id]/actions";
import { track } from "@/lib/analytics/posthog-client";
import { cn } from "@/lib/utils";

// Lives inside ReplyEditor's own action bar (not a separate section below
// it) so it's never a second thing to scroll past. `variant` controls how
// loud it reads: "quiet" is the fallback for someone who replies without
// ever clicking Copy (still reachable, but this is the uncommon path so it
// stays out of the way). "primary" is what ReplyEditor swaps in the moment
// the founder clicks "Copy & open post" — the single remaining action, in
// the exact spot they were just looking at, with the same pulsing-dot
// "needs your attention" motif used elsewhere (PollNowButton, signals page
// header) rather than inventing a new one.
export function MarkReplied({
  projectId,
  signalId,
  variant,
}: {
  projectId: string;
  signalId: string;
  variant: "primary" | "quiet";
}) {
  const boundAction = markAsRepliedAction.bind(null, projectId, signalId);
  const [state, formAction, isPending] = useActionState(boundAction, {});

  useEffect(() => {
    if (state.success) track("signal_marked_replied", { signal_id: signalId });
  }, [state.success, signalId]);

  if (state.success) {
    return (
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-accent">
        <CheckCircle2 className="size-3.5" />
        Reply logged.
      </div>
    );
  }

  if (variant === "quiet") {
    return (
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded px-1 py-1 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isPending ? "Marking…" : "Already replied? Mark it"}
        </button>
        {state.error && <p className="pt-1 text-[11px] font-medium text-destructive">{state.error}</p>}
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-end gap-1.5">
      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-[11px] tracking-wider text-accent uppercase transition-colors hover:bg-accent/20",
          "disabled:opacity-60"
        )}
      >
        <span className="relative flex size-2 shrink-0 items-center justify-center">
          <span className="absolute inline-flex size-2 animate-ping rounded-full bg-accent/60" />
          <span className="relative inline-flex size-1 rounded-full bg-accent" />
        </span>
        {isPending ? "Marking…" : "Mark replied"}
      </button>
      {state.error && <p className="text-[11px] font-medium text-destructive">{state.error}</p>}
    </form>
  );
}
