"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Copy, Check, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateOutreachDraftAction } from "@/app/(app)/projects/[projectId]/outreach/actions";
import { track } from "@/lib/analytics/posthog-client";

export function OutreachDraftEditor({
  projectId,
  leadId,
  initialMessage,
  initialToneNote,
  trackedUrl,
}: {
  projectId: string;
  leadId: string;
  initialMessage: string | null;
  initialToneNote: string | null;
  trackedUrl: string | null;
}) {
  const [message, setMessage] = useState(initialMessage ?? "");
  const [toneNote, setToneNote] = useState(initialToneNote ?? "");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();

  function handleGenerate() {
    setError(undefined);
    startTransition(async () => {
      const result = await generateOutreachDraftAction(projectId, leadId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
      setToneNote(result.toneNote);
      setCopied(false);
    });
  }

  async function handleCopy() {
    const textToCopy = trackedUrl ? `${message}\n\n${trackedUrl}` : message;
    await navigator.clipboard.writeText(textToCopy);
    track("outreach_draft_copied", { lead_id: leadId });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!message) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-secondary/5 px-5 py-6 text-center">
        <p className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          No draft yet
        </p>
        <Button
          type="button"
          disabled={isPending}
          onClick={handleGenerate}
          className="gap-2 rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <Sparkles className={`size-3.5 ${isPending ? "animate-pulse" : ""}`} />
          {isPending ? "Drafting…" : "Generate draft"}
        </Button>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-background/95 transition-all focus-within:ring-1 focus-within:ring-accent/30">
      <div className="flex gap-3 border-b border-accent/20 bg-accent/10 px-4 py-2.5">
        <Info className="mt-[2px] size-4 shrink-0 text-accent" />
        <p className="text-[13px] leading-tight text-muted-foreground">
          <strong className="font-medium text-foreground">Tone note:</strong> {toneNote}
        </p>
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={6}
        spellCheck={false}
        className="min-h-[140px] w-full resize-y bg-transparent p-5 text-[15px] leading-relaxed text-foreground outline-none"
      />

      <p className="px-5 pb-2 font-mono text-[10px] text-muted-foreground">
        AI-drafted — review before you send. You&apos;re responsible for what you actually send.
      </p>

      {!trackedUrl && (
        <p className="px-5 pb-2 font-mono text-[10px] text-muted-foreground">
          Set a website URL in Settings to auto-append a tracked link when copying.
        </p>
      )}

      {error && <p className="px-5 pb-2 text-sm font-medium text-destructive">{error}</p>}

      <div className="flex items-center justify-between border-t border-border bg-background/60 px-4 py-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleGenerate}
          className="flex items-center gap-2 rounded px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Regenerating…" : "Regenerate angle"}
        </button>

        <Button onClick={handleCopy} className="gap-2 rounded-md text-[11px] tracking-wider uppercase">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : trackedUrl ? "Copy message + link" : "Copy message"}
        </Button>
      </div>
    </div>
  );
}
