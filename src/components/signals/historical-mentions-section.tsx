"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, History, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";

export interface HistoricalMentionItem {
  id: string;
  title: string;
  permalink: string;
  venue: string;
  postedAt: Date;
}

// Mirrors below-threshold-section.tsx's collapse/expand shape, applied to a
// different data source: SearchResult rows Phase 2B's age/state bucketing
// judged ineligible for scoring (a resolved Stack Exchange thread, a
// months-old Reddit post — see isEligibleForScoring in
// search-ingestion.service.ts). These were never scored — no relevance
// score, no Signal, and deliberately no reply affordance here — this
// section exists purely as evidence the pain point gets mentioned, not as
// a second action queue.
export function HistoricalMentionsSection({
  totalCount,
  items,
}: {
  totalCount: number;
  items: HistoricalMentionItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (totalCount === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-background/40">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 font-mono text-xs tracking-wide text-muted-foreground">
          <History className="size-3.5" />
          Historical mentions — not reply targets ({totalCount})
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 border-t border-border/60 p-4">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground/70 transition-colors hover:bg-secondary/20 hover:text-foreground"
            >
              <span className="min-w-0 flex-1 truncate">{item.title}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50">
                {item.venue} · {formatRelativeTime(item.postedAt)}
              </span>
              <ArrowUpRight className="size-3 shrink-0 text-muted-foreground/40" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
