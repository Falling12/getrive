"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Copy, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateReplyAction } from "@/app/(app)/projects/[projectId]/signals/[id]/actions";
import { track } from "@/lib/analytics/posthog-client";

export function ReplyEditor({
  projectId,
  signalId,
  initialReply,
  initialToneNote,
  trackedUrl,
  postUrl,
}: {
  projectId: string;
  signalId: string;
  initialReply: string;
  initialToneNote: string;
  trackedUrl: string | null;
  postUrl: string;
}) {
  const [reply, setReply] = useState(initialReply);
  const [toneNote, setToneNote] = useState(initialToneNote);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();

  function handleRegenerate() {
    setError(undefined);
    startTransition(async () => {
      const result = await regenerateReplyAction(projectId, signalId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setReply(result.reply);
      setToneNote(result.toneNote);
      setCopied(false);
    });
  }

  async function handleCopy() {
    // Clipboard write must happen before window.open — opening a new tab shifts
    // focus away from this document, and Clipboard writes require document focus.
    const textToCopy = trackedUrl ? `${reply}\n\n${trackedUrl}` : reply;
    await navigator.clipboard.writeText(textToCopy);
    window.open(postUrl, "_blank", "noopener,noreferrer");
    track("signal_reply_copied", { signal_id: signalId });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-accent/50 bg-background/95 shadow-2xl transition-all focus-within:ring-1 focus-within:ring-accent/30">
      <div className="flex gap-3 border-b border-accent/20 bg-accent/10 px-4 py-2.5">
        <Info className="mt-[2px] size-4 shrink-0 text-accent" />
        <p className="text-[13px] leading-tight text-muted-foreground">
          <strong className="font-medium text-foreground">Tone note:</strong> {toneNote}
        </p>
      </div>

      <textarea
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        rows={7}
        spellCheck={false}
        className="min-h-[160px] w-full resize-y bg-transparent p-5 text-[15px] leading-relaxed text-foreground outline-none"
      />

      <p className="px-5 pb-2 font-mono text-[10px] text-muted-foreground">
        AI-drafted — review before you post. You&apos;re responsible for what you actually send.
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
          onClick={handleRegenerate}
          className="flex items-center gap-2 rounded px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Regenerating…" : "Regenerate angle"}
        </button>

        <Button onClick={handleCopy} className="gap-2 rounded-md text-[11px] tracking-wider uppercase">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : trackedUrl ? "Copy reply + link & open post" : "Copy reply & open post"}
        </Button>
      </div>
    </div>
  );
}
