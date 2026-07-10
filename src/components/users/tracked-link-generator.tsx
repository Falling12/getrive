"use client";

import { useActionState, useState } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createTrackedLinkAction } from "@/app/(app)/projects/[projectId]/users/actions";

export function TrackedLinkGenerator({ projectId }: { projectId: string }) {
  const boundAction = createTrackedLinkAction.bind(null, projectId);
  const [state, formAction, isPending] = useActionState(boundAction, {});
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!state.url) return;
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex w-full flex-col rounded-md border border-border bg-background/95 p-5 shadow-lg">
      <div className="mb-4 flex items-center gap-2">
        <Link2 className="size-4 text-accent" />
        <h3 className="font-medium text-foreground">Generate tracked link</h3>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex w-1/2 flex-col gap-1.5">
            <Label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Channel
            </Label>
            <input
              name="utmSource"
              defaultValue="reddit"
              className="w-full rounded border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </div>
          <div className="flex w-1/2 flex-col gap-1.5">
            <Label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Campaign
            </Label>
            <input
              name="utmCampaign"
              placeholder="e.g. bio-link"
              className="w-full rounded border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-full rounded-md">
          {isPending ? "Generating…" : "Generate link"}
        </Button>

        {state.error && <p className="font-mono text-xs text-destructive">{state.error}</p>}

        {state.url && (
          <div className="flex flex-col gap-1.5 pt-2">
            <Label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Generated URL
            </Label>
            <div className="flex overflow-hidden rounded border border-border bg-secondary/10 transition-all focus-within:border-accent">
              <input
                readOnly
                value={state.url}
                className="w-full bg-transparent px-3 py-2 font-mono text-[12px] text-foreground/90 outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center border-l border-border bg-secondary/30 px-3 text-muted-foreground transition-colors hover:bg-accent/20 hover:text-accent"
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
