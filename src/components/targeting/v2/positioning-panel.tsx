"use client";

import { useId, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IcpCandidate } from "@/lib/services/positioning.service";
import {
  generateProjectPositioningAction,
  updateProjectPositioningAction,
} from "@/app/(app)/projects/[projectId]/positioning/actions";
import { Radio, TextAction } from "@/components/targeting/v2/kit";

export function PositioningPanel(props: {
  projectId: string;
  statementCandidates: string[];
  recommendedStatementIndex: number;
  icpCandidates: IcpCandidate[];
  recommendedIcpIndex: number;
  selectedStatement: string | null;
  selectedIcpName: string | null;
  isStale: boolean;
}) {
  const { projectId, selectedStatement, selectedIcpName, isStale } = props;
  const hasSelection = Boolean(selectedStatement && selectedIcpName);
  const statementGroupName = useId();
  const icpGroupName = useId();

  const [editing, setEditing] = useState(!hasSelection || isStale);
  const [stale, setStale] = useState(isStale);
  const [candidates, setCandidates] = useState({
    statementCandidates: props.statementCandidates,
    recommendedStatementIndex: props.recommendedStatementIndex,
    icpCandidates: props.icpCandidates,
    recommendedIcpIndex: props.recommendedIcpIndex,
    recommendationReason: null as string | null,
  });
  const [statementIndex, setStatementIndex] = useState<number | null>(
    selectedStatement
      ? props.statementCandidates.indexOf(selectedStatement)
      : props.statementCandidates.length > 0
        ? props.recommendedStatementIndex
        : null
  );
  const [icpIndex, setIcpIndex] = useState<number | null>(
    selectedIcpName
      ? props.icpCandidates.findIndex((icp) => icp.name === selectedIcpName)
      : props.icpCandidates.length > 0
        ? props.recommendedIcpIndex
        : null
  );
  const [error, setError] = useState<string>();
  const [savedAt, setSavedAt] = useState<number>();
  const [isPending, startTransition] = useTransition();

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
      setEditing(false);
    });
  }

  if (hasSelection && !editing) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] leading-relaxed text-foreground">{selectedStatement}</p>
        <p className="text-sm text-muted-foreground">
          Primary ICP: <span className="font-medium text-foreground">{selectedIcpName}</span>
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="self-start text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Reconfigure
        </button>
      </div>
    );
  }

  if (candidates.statementCandidates.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
          Generate a positioning statement and candidate ICPs from your product description —
          you&apos;ll pick one of each.
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
    <div className="flex flex-col gap-10">
      {stale && (
        <p className="text-[13px] leading-snug text-muted-foreground">
          <strong className="font-medium text-foreground">Product details changed</strong> since this
          was generated — it may no longer fit. Regenerate to refresh it.
        </p>
      )}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-medium text-foreground">
          Statement — how Getrive should frame your product
        </legend>
        {candidates.statementCandidates.map((statement, index) => (
          <label key={index} className="flex cursor-pointer items-start gap-3">
            <Radio
              name={statementGroupName}
              checked={statementIndex === index}
              onChange={() => setStatementIndex(index)}
              className="mt-1"
            />
            <span className="text-sm leading-relaxed text-foreground">
              {statement}
              {index === candidates.recommendedStatementIndex && (
                <span className="ml-2 text-xs text-accent">recommended</span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <legend className="mb-1 text-sm font-medium text-foreground">Primary ICP — who feels this pain most</legend>
        {candidates.icpCandidates.map((icp, index) => (
          <label key={icp.name} className="flex cursor-pointer items-start gap-3">
            <Radio
              name={icpGroupName}
              checked={icpIndex === index}
              onChange={() => setIcpIndex(index)}
              className="mt-1"
            />
            <div className={cn("flex flex-1 flex-col gap-1.5", icpIndex !== index && "opacity-70")}>
              <span className="text-sm font-medium text-foreground">
                {icp.name}
                {index === candidates.recommendedIcpIndex && (
                  <span className="ml-2 text-xs font-normal text-accent">recommended</span>
                )}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{icp.reasoning}</p>
              {icp.audienceLanguage.length > 0 && (
                <p className="text-[13px] leading-relaxed text-muted-foreground/70 italic">
                  {icp.audienceLanguage.map((phrase) => `"${phrase}"`).join(", ")}
                </p>
              )}
              {index === candidates.recommendedIcpIndex && candidates.recommendationReason && (
                <p className="text-[13px] leading-snug text-accent">{candidates.recommendationReason}</p>
              )}
            </div>
          </label>
        ))}
      </fieldset>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <TextAction onClick={handleGenerate} disabled={isPending}>
          Regenerate options
        </TextAction>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-accent">Saved.</span>}
          {hasSelection && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="rounded-md">
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={statementIndex === null || icpIndex === null || isPending}
            className="rounded-md"
          >
            {isPending ? "Saving…" : "Save positioning"}
          </Button>
        </div>
      </div>
    </div>
  );
}
