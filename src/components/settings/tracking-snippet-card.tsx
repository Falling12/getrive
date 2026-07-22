"use client";

import { useState, useTransition } from "react";
import { Copy, Check, X, RefreshCw } from "lucide-react";
import { checkSnippetInstallationAction } from "@/app/(app)/projects/[projectId]/settings/actions";
import { Button } from "@/components/ui/button";

function SnippetBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded border border-border bg-secondary/10 p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
        {code}
      </pre>
    </div>
  );
}

function StatusRow({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <div className="flex items-start gap-2">
      {ok ? (
        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
      ) : (
        <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
      )}
      <p className="font-mono text-[11px] leading-relaxed">
        <span className={ok ? "text-accent" : "text-foreground/90"}>
          {label} {ok ? "detected" : "not detected"}
        </span>
        {hint && <span className="mt-0.5 block text-muted-foreground">{hint}</span>}
      </p>
    </div>
  );
}

export function TrackingSnippetCard({
  projectId,
  captureSnippet,
  reportSnippet,
}: {
  projectId: string;
  captureSnippet: string;
  reportSnippet: string;
}) {
  const [isChecking, startCheck] = useTransition();
  const [result, setResult] = useState<
    Awaited<ReturnType<typeof checkSnippetInstallationAction>> | null
  >(null);

  function handleCheck() {
    startCheck(async () => {
      setResult(await checkSnippetInstallationAction(projectId));
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <SnippetBlock label="1. Paste on every page" code={captureSnippet} />
      <SnippetBlock label="2. Paste only on your post-signup page" code={reportSnippet} />

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] text-muted-foreground">Already pasted these in?</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isChecking}
            onClick={handleCheck}
            className="shrink-0 gap-1.5 rounded-md"
          >
            <RefreshCw className={`size-3.5 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking…" : "Check installation"}
          </Button>
        </div>

        {result?.status === "error" && <p className="text-sm text-destructive">{result.error}</p>}

        {result?.status === "success" && (
          <div className="flex flex-col gap-2.5 rounded border border-border bg-secondary/10 p-3">
            <StatusRow ok={result.captureDetected} label="Capture snippet" />
            <StatusRow
              ok={result.reportDetected}
              label="Report snippet"
              hint={
                result.reportDetected
                  ? undefined
                  : "Expected here — it only runs on your post-signup page, not this one. We'll confirm it's working the moment your first automatic signup arrives."
              }
            />
            <p className="font-mono text-[10px] text-muted-foreground/70">
              Checked {result.checkedUrl}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
