"use client";

import { useActionState } from "react";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { logSignupAction } from "@/app/(app)/projects/[projectId]/users/actions";

export function LogSignupForm({
  projectId,
  trackedLinks,
}: {
  projectId: string;
  trackedLinks: { id: string; label: string }[];
}) {
  const boundAction = logSignupAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(boundAction, {});

  return (
    <div className="flex w-full flex-col rounded-md border border-border bg-background/95 p-5 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <NotebookPen className="size-4 text-accent" />
        <h3 className="font-medium text-foreground">Log a signup</h3>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Attribution source
          </Label>
          <select
            name="trackedLinkId"
            className="w-full rounded border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            <option value="untracked">Untracked / manual</option>
            {trackedLinks.map((link) => (
              <option key={link.id} value={link.id}>
                {link.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Context / note
          </Label>
          <input
            name="note"
            placeholder="e.g. replied to comment thread"
            className="w-full rounded border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
          />
        </div>

        {state.success && <p className="font-mono text-xs text-accent">Signup logged.</p>}

        <Button type="submit" disabled={isPending} className="mt-1 w-full rounded-md">
          {isPending ? "Saving…" : "Submit log"}
        </Button>
      </form>
    </div>
  );
}
