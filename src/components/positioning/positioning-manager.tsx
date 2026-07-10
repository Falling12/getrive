"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PositioningCandidates } from "@/components/positioning/positioning-candidates";
import type { IcpCandidate } from "@/lib/services/positioning.service";
import {
  generateProjectPositioningAction,
  updateProjectPositioningAction,
} from "@/app/(app)/projects/[projectId]/positioning/actions";

export function PositioningManager({
  projectId,
  statementCandidates: initialStatements,
  recommendedStatementIndex: initialRecommendedStatementIndex,
  icpCandidates: initialIcps,
  recommendedIcpIndex: initialRecommendedIcpIndex,
  selectedStatement,
  selectedIcpName,
  isStale,
}: {
  projectId: string;
  statementCandidates: string[];
  recommendedStatementIndex: number;
  icpCandidates: IcpCandidate[];
  recommendedIcpIndex: number;
  selectedStatement: string | null;
  selectedIcpName: string | null;
  isStale: boolean;
}) {
  const [stale, setStale] = useState(isStale);
  const [candidates, setCandidates] = useState({
    statementCandidates: initialStatements,
    recommendedStatementIndex: initialRecommendedStatementIndex,
    icpCandidates: initialIcps,
    recommendedIcpIndex: initialRecommendedIcpIndex,
    // Only known right after a fresh (re)generation in this session — a
    // cold page load has the recommended indices (persisted columns) but
    // not the prose reason (not persisted; most useful right when generated).
    recommendationReason: null as string | null,
  });
  // Falls back to the AI's recommendation when nothing's been confirmed yet
  // (either a brand-new generation, or an existing row that was generated
  // but never saved) — otherwise respects the founder's actual prior choice.
  const [statementIndex, setStatementIndex] = useState<number | null>(
    selectedStatement
      ? initialStatements.indexOf(selectedStatement)
      : initialStatements.length > 0
        ? initialRecommendedStatementIndex
        : null
  );
  const [icpIndex, setIcpIndex] = useState<number | null>(
    selectedIcpName
      ? initialIcps.findIndex((icp) => icp.name === selectedIcpName)
      : initialIcps.length > 0
        ? initialRecommendedIcpIndex
        : null
  );
  const [error, setError] = useState<string>();
  const [savedAt, setSavedAt] = useState<number>();
  const [isPending, startTransition] = useTransition();

  const hasCandidates = candidates.statementCandidates.length > 0;

  function handleGenerate() {
    setError(undefined);
    setSavedAt(undefined);
    startTransition(async () => {
      const result = await generateProjectPositioningAction(projectId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCandidates(result);
      setStatementIndex(result.recommendedStatementIndex);
      setIcpIndex(result.recommendedIcpIndex);
      setStale(false);
    });
  }

  function handleSave() {
    if (statementIndex === null || icpIndex === null) return;
    setError(undefined);
    startTransition(async () => {
      const result = await updateProjectPositioningAction(projectId, {
        selectedStatement: candidates.statementCandidates[statementIndex],
        selectedIcpIndex: icpIndex,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  if (!hasCandidates) {
    return (
      <div className="flex flex-col items-start gap-4 rounded border border-dashed border-border p-6">
        <p className="max-w-md font-mono text-xs leading-relaxed text-muted-foreground">
          Generate a positioning statement and candidate ICPs from your product description.
          You&apos;ll pick one of each — it sharpens Signal Scoring and feeds Outreach drafts.
        </p>
        <Button onClick={handleGenerate} disabled={isPending} className="gap-2 rounded-md">
          <Sparkles className="size-4" />
          {isPending ? "Generating…" : "Generate positioning"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {stale && (
        <div className="flex items-start gap-3 rounded border border-accent/40 bg-accent/10 px-4 py-3">
          <AlertTriangle className="mt-[2px] size-4 shrink-0 text-accent" />
          <p className="text-[13px] leading-snug text-muted-foreground">
            <strong className="font-medium text-foreground">Product details changed</strong> since
            this positioning was generated — it may no longer reflect your product accurately.
            Regenerate to refresh it.
          </p>
        </div>
      )}

      <PositioningCandidates
        statementCandidates={candidates.statementCandidates}
        recommendedStatementIndex={candidates.recommendedStatementIndex}
        icpCandidates={candidates.icpCandidates}
        recommendedIcpIndex={candidates.recommendedIcpIndex}
        recommendationReason={candidates.recommendationReason}
        selectedStatementIndex={statementIndex}
        selectedIcpIndex={icpIndex}
        onSelectStatement={setStatementIndex}
        onSelectIcp={setIcpIndex}
      />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex items-center justify-between border-t border-border pt-6">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" />
          Regenerate options
        </button>
        <div className="flex items-center gap-3">
          {savedAt && <span className="font-mono text-xs text-accent">Saved.</span>}
          <Button
            onClick={handleSave}
            disabled={statementIndex === null || icpIndex === null || isPending}
            className="gap-2 rounded-md"
          >
            {isPending ? "Saving…" : "Save positioning"}
          </Button>
        </div>
      </div>
    </div>
  );
}
