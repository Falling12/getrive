"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

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

export function TrackingSnippetCard({
  captureSnippet,
  reportSnippet,
}: {
  captureSnippet: string;
  reportSnippet: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <SnippetBlock label="1. Paste on every page" code={captureSnippet} />
      <SnippetBlock label="2. Paste only on your post-signup page" code={reportSnippet} />
    </div>
  );
}
