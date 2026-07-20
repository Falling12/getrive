"use client";

import { useState } from "react";
import { ChevronDown, PencilLine } from "lucide-react";
import { PositioningManager } from "@/components/positioning/positioning-manager";
import type { IcpCandidate } from "@/lib/services/positioning.service";
import { cn } from "@/lib/utils";

// Read-first wrapper around PositioningManager: once a statement and ICP are
// chosen, Targeting shows them as a compact summary (the thing the founder
// actually comes back to check) and tucks the full candidate picker behind
// "Edit". With nothing chosen yet — or a stale selection — the editor IS the
// surface, so it opens directly.
export function PositioningSummary(props: {
  projectId: string;
  statementCandidates: string[];
  recommendedStatementIndex: number;
  icpCandidates: IcpCandidate[];
  recommendedIcpIndex: number;
  selectedStatement: string | null;
  selectedIcpName: string | null;
  isStale: boolean;
}) {
  const { selectedStatement, selectedIcpName, icpCandidates, isStale } = props;
  const hasSelection = Boolean(selectedStatement && selectedIcpName);
  const [editing, setEditing] = useState(!hasSelection || isStale);

  if (editing || !hasSelection) {
    return (
      <div className="flex flex-col gap-4">
        {hasSelection && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 self-end font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <ChevronDown className="size-3.5 rotate-180" />
            Hide editor
          </button>
        )}
        <PositioningManager {...props} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <blockquote className="border-l-2 border-accent pl-4 text-[15px] leading-relaxed text-foreground">
        {selectedStatement}
      </blockquote>

      <div className="flex flex-wrap items-center gap-2">
        {icpCandidates.map((icp) => {
          const isSelected = icp.name === selectedIcpName;
          return (
            <span
              key={icp.name}
              className={cn(
                "max-w-full rounded-full border px-3 py-1 font-mono text-[10px] leading-relaxed",
                isSelected
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground/60"
              )}
            >
              {isSelected && "ICP: "}
              {icp.name}
            </span>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-4">
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
          Sharpens signal scoring &amp; reply drafts
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <PencilLine className="size-3.5" />
          Edit
        </button>
      </div>
    </div>
  );
}
