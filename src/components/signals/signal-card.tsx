"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Target, Info, CheckCircle2, XCircle, MessageCircle, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { dismissSignalAction } from "@/app/(app)/projects/[projectId]/signals/actions";

export interface SignalCardData {
  id: string;
  sourceLabel: string;
  title: string;
  snippet: string;
  permalink: string;
  relevanceScore: number;
  relevanceReason: string;
  postedAt: Date;
  replied: boolean;
  dismissed: boolean;
  // True when this signal's source is one search-ingestion.service.ts
  // auto-created (Source.discoveredViaSearch) rather than a community the
  // founder chose to poll — distinguished in the UI since it came from
  // actively searching for the pain point, not from a monitored feed.
  isSearchOrigin?: boolean;
}

type Tier = "high" | "medium" | "low";

function tierFor(score: number): Tier {
  if (score >= 0.9) return "high";
  if (score >= 0.8) return "medium";
  return "low";
}

export function SignalCard({ projectId, signal }: { projectId: string; signal: SignalCardData }) {
  const [isPending, startTransition] = useTransition();
  const tier = tierFor(signal.relevanceScore);
  const filledSegments = Math.min(5, Math.max(1, Math.round(signal.relevanceScore * 5)));

  return (
    <article
      className={cn(
        "relative p-4 transition-colors md:p-5",
        tier === "high" &&
          "rounded-r-lg rounded-l-sm border border-border border-l-4 border-l-accent bg-background/95 shadow-[inset_0_0_20px_rgba(74,106,94,0.03)] hover:bg-[#0c1615]",
        tier === "medium" &&
          "rounded-lg border border-border bg-background/80 hover:border-[#355249]",
        tier === "low" &&
          "rounded-lg border border-border/40 bg-background/40 opacity-80 transition-opacity hover:opacity-100"
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Relevance anchor */}
        <div className="flex shrink-0 items-center justify-between gap-4 pt-0.5 md:w-16 md:flex-col md:items-start md:justify-start md:gap-1">
          <div className="flex items-baseline gap-0.5">
            <span
              className={cn(
                "font-mono text-4xl leading-none font-bold tracking-tighter",
                tier === "high" && "text-foreground",
                tier === "medium" && "text-accent",
                tier === "low" && "text-muted-foreground"
              )}
            >
              {Math.round(signal.relevanceScore * 100)}
            </span>
            <span
              className={cn(
                "font-mono text-sm font-medium",
                tier === "high" && "text-accent",
                tier === "medium" && "text-accent/70",
                tier === "low" && "text-muted-foreground/50"
              )}
            >
              %
            </span>
          </div>
          <div className="mt-1 flex w-24 gap-[2px] md:w-full">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-[1px]",
                  i < filledSegments ? (tier === "low" ? "bg-muted-foreground" : "bg-accent") : "bg-secondary"
                )}
              />
            ))}
          </div>
        </div>

        {/* Core info */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[10px]",
                tier === "high" && "bg-secondary/50 text-accent",
                tier === "medium" && "bg-secondary/30 text-muted-foreground",
                tier === "low" && "border border-border/30 bg-secondary/20 text-muted-foreground"
              )}
            >
              {signal.sourceLabel}
            </span>
            {signal.isSearchOrigin && (
              <span className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-accent">
                <Radar className="size-2.5" />
                Search
              </span>
            )}
            <span
              className={cn(
                "font-mono text-[10px]",
                tier === "low" ? "text-muted-foreground/40" : "text-muted-foreground/50"
              )}
            >
              {formatRelativeTime(signal.postedAt)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <h2
              className={cn(
                "truncate text-[17px] leading-snug font-medium md:text-lg",
                tier === "low" ? "text-muted-foreground/90" : "text-foreground"
              )}
            >
              <Link
                href={signal.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent"
              >
                {signal.title}
              </Link>
            </h2>

            {tier === "low" ? (
              <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground/70">
                <Info className="size-3.5 shrink-0 text-muted-foreground/50" />
                <span className="truncate">Vague match: {signal.relevanceReason}</span>
              </p>
            ) : (
              <div
                className={cn(
                  "flex w-max max-w-full items-center gap-2 rounded px-2.5 py-1.5",
                  tier === "high" && "bg-accent/10 shadow-[inset_0_0_0_1px_rgba(74,106,94,0.3)]",
                  tier === "medium" && "border border-border bg-secondary/20"
                )}
              >
                <Target
                  fill="currentColor"
                  className={cn(
                    "size-3.5 shrink-0",
                    tier === "high" ? "text-accent" : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "truncate pr-2 text-[13px]",
                    tier === "high" ? "text-foreground/90" : "text-muted-foreground"
                  )}
                >
                  Signal match:{" "}
                  <strong
                    className={cn("font-medium", tier === "high" ? "text-accent" : "text-foreground/90")}
                  >
                    {signal.relevanceReason}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <p
            className={cn(
              "line-clamp-2 text-[13px] leading-relaxed",
              tier === "low" ? "text-muted-foreground/50" : "text-muted-foreground/60"
            )}
          >
            {signal.snippet}
          </p>
        </div>

        {/* Actions */}
        <div
          className={cn(
            "flex shrink-0 flex-row gap-2 border-t pt-3 md:w-32 md:flex-col md:border-t-0 md:border-l md:pt-0 md:pl-5",
            tier === "low" ? "justify-end border-border/20 md:justify-center" : "justify-end border-border/30"
          )}
        >
          {signal.replied ? (
            <div className="flex w-full items-center justify-center gap-1.5 rounded border border-accent/20 bg-accent/10 px-3 py-2 font-mono text-[11px] text-accent">
              <CheckCircle2 fill="currentColor" className="size-3.5" />
              <span className="tracking-wider uppercase">Replied</span>
            </div>
          ) : signal.dismissed ? (
            <div className="flex w-full items-center justify-center gap-1.5 rounded border border-border bg-secondary/10 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              <XCircle className="size-3.5" />
              <span className="tracking-wider uppercase">Dismissed</span>
            </div>
          ) : (
            <>
              <Link
                href={`/projects/${projectId}/signals/${signal.id}`}
                className="order-2 flex w-full items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-mono text-[11px] tracking-wider text-foreground uppercase shadow-[0_0_0_1px_var(--border)] transition-all hover:-translate-y-[1px] hover:bg-accent active:scale-95 md:order-1"
              >
                <MessageCircle className="size-3.5" />
                Reply
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => dismissSignalAction(projectId, signal.id))}
                className="order-1 w-full px-4 py-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground active:scale-95 disabled:opacity-50 md:order-2"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
