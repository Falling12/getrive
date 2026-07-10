"use client";

import { useState, useTransition } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PositioningCandidates } from "@/components/positioning/positioning-candidates";
import { regeneratePositioningAction } from "@/app/onboarding/actions";
import type { IcpCandidate, PositioningCandidatesView } from "@/lib/services/positioning.service";

export function OnboardingPositioning({
  formAction,
  productId,
  statementCandidates,
  recommendedStatementIndex,
  icpCandidates,
  recommendedIcpIndex,
  recommendationReason,
  error,
}: {
  formAction: (formData: FormData) => void;
  productId: string;
  statementCandidates: string[];
  recommendedStatementIndex: number;
  icpCandidates: IcpCandidate[];
  recommendedIcpIndex: number;
  recommendationReason: string;
  error?: string;
}) {
  const [candidates, setCandidates] = useState<PositioningCandidatesView>({
    statementCandidates,
    recommendedStatementIndex,
    icpCandidates,
    recommendedIcpIndex,
    recommendationReason,
  });
  // Pre-selected to the AI's own recommendation — a founder who just wants
  // to move on can hit Confirm immediately; deliberating is optional, not
  // required.
  const [statementIndex, setStatementIndex] = useState<number | null>(recommendedStatementIndex);
  const [icpIndex, setIcpIndex] = useState<number | null>(recommendedIcpIndex);
  const [regenerateError, setRegenerateError] = useState<string>();
  const [isRegenerating, startRegenerate] = useTransition();

  function handleRegenerate() {
    setRegenerateError(undefined);
    startRegenerate(async () => {
      const result = await regeneratePositioningAction(productId);
      if ("error" in result) {
        setRegenerateError(result.error);
        return;
      }
      setCandidates(result);
      setStatementIndex(result.recommendedStatementIndex);
      setIcpIndex(result.recommendedIcpIndex);
    });
  }

  const canConfirm = statementIndex !== null && icpIndex !== null;

  return (
    <form action={formAction} className="flex w-full flex-1 flex-col pb-32">
      <input type="hidden" name="intent" value="selectPositioning" />
      <input type="hidden" name="productId" value={productId} />
      <input
        type="hidden"
        name="selectedStatement"
        value={statementIndex !== null ? candidates.statementCandidates[statementIndex] : ""}
      />
      <input type="hidden" name="selectedIcpIndex" value={icpIndex ?? ""} />

      <header className="mb-10 lg:mb-12">
        <div className="mb-3 flex items-center gap-2">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
            Phase 02 — Positioning
          </span>
        </div>
        <h1 className="mb-2 text-3xl font-medium tracking-tight text-foreground">
          Choose your positioning
        </h1>
        <p className="max-w-lg font-mono text-xs leading-relaxed text-muted-foreground">
          Getrive generated a few candidate framings from your description and pre-selected its own
          recommendation — pick something else if it doesn&apos;t feel right, or just confirm.
        </p>
      </header>

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

      {(regenerateError ?? error) && (
        <p className="mt-6 text-sm font-medium text-destructive">{regenerateError ?? error}</p>
      )}

      <div className="fixed right-0 bottom-0 z-50 flex w-full items-center justify-between border-t border-border bg-background/90 p-6 backdrop-blur-lg md:w-[calc(100%-320px)] lg:w-[calc(100%-380px)] lg:px-12">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground disabled:opacity-50"
        >
          <RotateCcw className="size-3.5" />
          {isRegenerating ? "Regenerating…" : "Regenerate options"}
        </button>
        <Button
          type="submit"
          disabled={!canConfirm || isRegenerating}
          size="lg"
          className="h-12 gap-2 rounded-md px-6 text-sm lg:px-8"
        >
          Confirm positioning
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </form>
  );
}
