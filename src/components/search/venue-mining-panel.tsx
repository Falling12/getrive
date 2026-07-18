"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  promoteVenueMiningSourceAction,
  dismissVenueMiningCandidateAction,
} from "@/app/(app)/projects/[projectId]/search/actions";
import { formatSourceLabel } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

export interface VenueMiningRowData {
  sourceId: string;
  type: SourceType;
  name: string;
  reasoning: string;
  signalCount: number;
  matchCount: number;
}

export function VenueMiningPanel({
  projectId,
  candidates,
}: {
  projectId: string;
  candidates: VenueMiningRowData[];
}) {
  if (candidates.length === 0) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        No venues have produced enough real signals to recommend yet — run ingestion first.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="divide-y divide-border/60">
        {candidates.map((c) => (
          <VenueRow key={c.sourceId} projectId={projectId} candidate={c} />
        ))}
      </div>
    </div>
  );
}

function VenueRow({ projectId, candidate }: { projectId: string; candidate: VenueMiningRowData }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  return (
    <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">{formatSourceLabel(candidate.type, candidate.name)}</h3>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] tracking-wide text-accent">
            {candidate.signalCount}/{candidate.matchCount} signals
          </span>
        </div>
        <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground/80">{candidate.reasoning}</p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await dismissVenueMiningCandidateAction(projectId, candidate.sourceId);
              if (result.error) setError(result.error);
              else setResolved(true);
            })
          }
          className="rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <X className="size-3.5" />
          Dismiss
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await promoteVenueMiningSourceAction(projectId, {
                type: candidate.type,
                name: candidate.name,
                reasoning: candidate.reasoning,
              });
              if (result.error) setError(result.error);
              else setResolved(true);
            })
          }
          className="rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <Plus className="size-3.5" />
          Promote
        </Button>
      </div>
    </div>
  );
}
