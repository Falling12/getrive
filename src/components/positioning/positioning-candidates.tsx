"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IcpCandidate } from "@/lib/services/positioning.service";

const cardBase =
  "group relative flex w-full cursor-pointer items-start gap-4 rounded-lg bg-background p-5 text-left shadow-[inset_0_0_0_1px_var(--border)] transition-all duration-300 hover:shadow-[inset_0_0_0_1px_var(--accent)] md:p-6";
const cardSelected = "bg-primary/5 shadow-[inset_0_0_0_1px_var(--accent)]";

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
        selected ? "border-accent" : "border-border"
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full bg-accent transition-transform duration-200",
          selected ? "scale-100" : "scale-0"
        )}
      />
    </span>
  );
}

function RecommendedBadge() {
  return (
    <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 font-mono text-[10px] font-medium tracking-widest text-accent uppercase">
      <Sparkles className="size-3" />
      Recommended
    </span>
  );
}

export function PositioningCandidates({
  statementCandidates,
  recommendedStatementIndex,
  icpCandidates,
  recommendedIcpIndex,
  recommendationReason,
  selectedStatementIndex,
  selectedIcpIndex,
  onSelectStatement,
  onSelectIcp,
}: {
  statementCandidates: string[];
  recommendedStatementIndex?: number | null;
  icpCandidates: IcpCandidate[];
  recommendedIcpIndex?: number | null;
  recommendationReason?: string | null;
  selectedStatementIndex: number | null;
  selectedIcpIndex: number | null;
  onSelectStatement: (index: number) => void;
  onSelectIcp: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            A. Positioning statement
          </h2>
          <p className="font-mono text-xs text-muted-foreground/70">
            How Getrive should frame your product when it reasons about fit.
          </p>
        </div>
        <div role="radiogroup" aria-label="Positioning statement" className="flex flex-col gap-3">
          {statementCandidates.map((statement, index) => (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={selectedStatementIndex === index}
              onClick={() => onSelectStatement(index)}
              className={cn(cardBase, selectedStatementIndex === index && cardSelected)}
            >
              {index === recommendedStatementIndex && <RecommendedBadge />}
              <RadioDot selected={selectedStatementIndex === index} />
              <p className="pr-20 text-[15px] leading-snug text-foreground">{statement}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            B. Who feels this pain most
          </h2>
          <p className="font-mono text-xs text-muted-foreground/70">
            Pick a primary ICP — it sharpens Signal Scoring and feeds Outreach drafts.
          </p>
        </div>
        <div role="radiogroup" aria-label="Primary ICP" className="flex flex-col gap-4">
          {icpCandidates.map((icp, index) => (
            <button
              key={index}
              type="button"
              role="radio"
              aria-checked={selectedIcpIndex === index}
              onClick={() => onSelectIcp(index)}
              className={cn(
                cardBase,
                "flex-col items-stretch gap-4 sm:flex-row sm:items-start",
                selectedIcpIndex === index && cardSelected
              )}
            >
              {index === recommendedIcpIndex && <RecommendedBadge />}
              <RadioDot selected={selectedIcpIndex === index} />
              <div className="flex flex-1 flex-col gap-3 pr-20 sm:pr-24">
                <h3 className="font-mono text-xs font-medium tracking-widest text-foreground uppercase">
                  {icp.name}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{icp.reasoning}</p>
                <div className="border-t border-border/60 pt-3">
                  <span className="mb-2 block font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase">
                    How they actually describe this problem
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {icp.audienceLanguage.map((phrase) => (
                      <span
                        key={phrase}
                        className="rounded border border-border bg-secondary/20 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                      >
                        &ldquo;{phrase}&rdquo;
                      </span>
                    ))}
                  </div>
                </div>
                {index === recommendedIcpIndex && recommendationReason && (
                  <p className="border-t border-accent/30 pt-3 text-[13px] leading-snug text-accent">
                    {recommendationReason}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
