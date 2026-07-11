"use client";

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAsRepliedAction } from "@/app/(app)/projects/[projectId]/signals/[id]/actions";
import { track } from "@/lib/analytics/posthog-client";

export function MarkReplied({ projectId, signalId }: { projectId: string; signalId: string }) {
  const [expanded, setExpanded] = useState(false);
  const boundAction = markAsRepliedAction.bind(null, projectId, signalId);
  const [state, formAction, isPending] = useActionState(boundAction, {});

  useEffect(() => {
    if (state.success) track("signal_marked_replied", { signal_id: signalId });
  }, [state.success, signalId]);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <div className="flex size-10 items-center justify-center rounded-full border border-accent/50 bg-accent/10">
          <CheckCircle2 className="size-5 text-accent" />
        </div>
        <p className="text-sm font-medium text-foreground">Reply logged.</p>
        <p className="font-mono text-xs text-muted-foreground">
          Tracking is enabled for this reply&apos;s link.
        </p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full px-6 py-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:text-foreground hover:shadow-[inset_0_0_0_1px_var(--accent)]"
        >
          Mark as replied…
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-md flex-col gap-3 pt-4">
      <label className="text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Paste the URL of the comment you posted
      </label>
      <div className="flex gap-2">
        <input
          type="url"
          name="postUrl"
          required
          placeholder="https://reddit.com/r/subreddit/comments/..."
          className="flex-1 rounded border border-border bg-background px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
        />
        <Button type="submit" disabled={isPending} className="rounded-md">
          {isPending ? "Saving…" : "Confirm"}
        </Button>
      </div>
      {state.error && <p className="text-center text-sm font-medium text-destructive">{state.error}</p>}
    </form>
  );
}
