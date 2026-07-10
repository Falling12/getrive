"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function SignupRedirectGenerator({
  appUrl,
  productId,
  websiteUrl,
}: {
  appUrl: string;
  productId: string;
  websiteUrl: string | null;
}) {
  const [nextUrl, setNextUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const generated = nextUrl
    ? `${appUrl}/api/track/confirm?productId=${productId}&next=${encodeURIComponent(nextUrl)}`
    : "";

  async function handleCopy() {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!websiteUrl) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        Set a website URL above before generating a signup redirect.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Your post-signup / thank-you page URL
        </label>
        <input
          value={nextUrl}
          onChange={(event) => setNextUrl(event.target.value)}
          placeholder={`${websiteUrl.replace(/\/$/, "")}/welcome`}
          className="w-full rounded border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-accent"
        />
      </div>

      {generated && (
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Paste this into your signup tool&apos;s &ldquo;redirect after signup&rdquo; field
          </label>
          <div className="flex overflow-hidden rounded border border-border bg-secondary/10 transition-all focus-within:border-accent">
            <input
              readOnly
              value={generated}
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
    </div>
  );
}
