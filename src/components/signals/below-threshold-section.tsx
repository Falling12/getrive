"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSourceLabel } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

export interface BelowThresholdItem {
  id: string;
  title: string | null;
  permalink: string | null;
  relevanceScore: number;
  scoredAt: Date;
  sourceType: SourceType;
  sourceName: string;
}

// Collapsed by default — this is "show your work" for the scoring gate,
// not something a founder needs open on every visit. Only the count is
// visible until they go looking for it.
export function BelowThresholdSection({
  items,
  totalCount,
}: {
  items: BelowThresholdItem[];
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  if (totalCount === 0) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-border/60 pt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 self-start font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        {totalCount} candidate{totalCount === 1 ? " " : "s "} didn&apos;t meet the threshold
        {items.length < totalCount && (
          <span className="text-muted-foreground/60">(showing latest {items.length})</span>
        )}
      </button>

      {open && (
        <div className="flex flex-col divide-y divide-border/40 rounded-md border border-border/60">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="shrink-0 rounded border border-border bg-secondary/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {formatSourceLabel(item.sourceType, item.sourceName)}
                </span>
                {item.permalink ? (
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-[13px] text-foreground underline-offset-2 hover:underline"
                  >
                    {item.title || item.permalink}
                  </a>
                ) : (
                  <span className="truncate text-[13px] text-muted-foreground">
                    {item.title || "Untitled post"}
                  </span>
                )}
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {Math.round(item.relevanceScore * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
