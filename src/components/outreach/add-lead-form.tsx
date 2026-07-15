"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addLeadAction } from "@/app/(app)/projects/[projectId]/outreach/actions";

export function AddLeadForm({ projectId }: { projectId: string }) {
  const [state, formAction, isPending] = useActionState(addLeadAction.bind(null, projectId), {});

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <header className="flex items-start gap-3 border-b border-border/60 p-5 md:p-6">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
          <UserPlus className="size-4" />
        </span>
        <div>
          <h2 className="text-lg font-medium text-foreground">Add a lead</h2>
          <p className="mt-1 max-w-[68ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
            Paste in someone you found manually — a Reddit profile, a Twitter reply, anyone worth a
            cold, genuine first message. Getrive only ever drafts; you copy and send it yourself.
          </p>
        </div>
      </header>

      <form
        action={formAction}
        key={state.success ? "reset" : "form"}
        className="flex flex-col gap-4 p-5 md:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Name
            </label>
            <input
              name="name"
              required
              placeholder="Jordan Lee"
              autoComplete="off"
              className="ph-mask rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Handle <span className="normal-case text-muted-foreground/60">(optional, for dedup)</span>
            </label>
            <input
              name="handle"
              placeholder="@jordanlee"
              autoComplete="off"
              className="ph-mask rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            What you know about them
          </label>
          <textarea
            name="context"
            required
            rows={3}
            placeholder="Found them asking about [problem] in r/saas — building a small internal tool for their team, seems to hit the exact pain point Getrive solves."
            className="ph-mask resize-y rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {state.error && <p className="text-xs text-destructive">{state.error}</p>}
            {state.warnings?.map((warning, i) => (
              <p key={i} className="font-mono text-[11px] text-accent">
                Heads up: {warning}
              </p>
            ))}
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
          >
            {isPending ? "Adding…" : "Add lead"}
          </Button>
        </div>
      </form>
    </section>
  );
}
