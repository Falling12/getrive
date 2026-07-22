"use client";

import { useState, useTransition } from "react";
import { Sparkles, Radar, Plus, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  discoverNewSourcesAction,
  addDiscoveredSourceAction,
  type DiscoveredSourceView,
} from "@/app/(app)/projects/[projectId]/sources/actions";
import {
  promoteVenueMiningSourceAction,
  dismissVenueMiningCandidateAction,
} from "@/app/(app)/projects/[projectId]/search/actions";
import { formatSourceLabel } from "@/lib/sources/format";
import {
  useDiscoveryState,
  setDiscoveryState,
  getDiscoveryState,
} from "@/lib/sources/discovery-store";

function suggestionKey(s: { type: string; name: string }) {
  return `${s.type}:${s.name}`;
}

export function AiDiscoveryPanel({ projectId }: { projectId: string }) {
  const { status, suggestions, error, addedKeys } = useDiscoveryState(projectId);
  const isDiscovering = status === "loading";

  function runDiscovery() {
    setDiscoveryState(projectId, { status: "loading", error: null });
    discoverNewSourcesAction(projectId).then((result) => {
      if (result.status === "error") {
        setDiscoveryState(projectId, { status: "error", error: result.error, suggestions: null });
      } else if (result.status === "results") {
        setDiscoveryState(projectId, { status: "results", suggestions: result.suggestions, error: null });
      }
    });
  }

  const proven = suggestions?.filter((s) => s.evidence) ?? [];
  const guessed = suggestions?.filter((s) => !s.evidence) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            Discover new channels
          </h3>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-muted-foreground/80">
            Scans your positioning and past search results for channels worth monitoring — you
            choose which ones to add.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isDiscovering}
          onClick={runDiscovery}
          className="w-fit shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          {isDiscovering ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              {suggestions ? "Scan again" : "Scan for channels"}
            </>
          )}
        </Button>
      </div>

      {error && <p className="font-mono text-xs text-destructive">{error}</p>}

      {suggestions && suggestions.length === 0 && !error && (
        <p className="font-mono text-xs text-muted-foreground">
          No new suggestions beyond what you&apos;re already monitoring.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          {proven.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 border-b border-border/60 bg-accent/[0.06] px-4 py-2">
                <Radar className="size-3 text-accent" />
                <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                  Already producing signals
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {proven.map((suggestion) => (
                  <SuggestionRow
                    key={suggestionKey(suggestion)}
                    projectId={projectId}
                    suggestion={suggestion}
                    added={addedKeys.has(suggestionKey(suggestion))}
                    onAdded={() => {
                      const next = new Set(getDiscoveryState(projectId).addedKeys);
                      next.add(suggestionKey(suggestion));
                      setDiscoveryState(projectId, { addedKeys: next });
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {guessed.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 border-b border-border/60 bg-secondary/10 px-4 py-2">
                <Sparkles className="size-3 text-muted-foreground" />
                <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  AI suggested, unproven
                </span>
              </div>
              <div className="divide-y divide-border/60">
                {guessed.map((suggestion) => (
                  <SuggestionRow
                    key={suggestionKey(suggestion)}
                    projectId={projectId}
                    suggestion={suggestion}
                    added={addedKeys.has(suggestionKey(suggestion))}
                    onAdded={() => {
                      const next = new Set(getDiscoveryState(projectId).addedKeys);
                      next.add(suggestionKey(suggestion));
                      setDiscoveryState(projectId, { addedKeys: next });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionRow({
  projectId,
  suggestion,
  added,
  onAdded,
}: {
  projectId: string;
  suggestion: DiscoveredSourceView;
  added: boolean;
  onAdded: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const isActive = suggestion.alreadyActive || added;
  if (dismissed) return null;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = suggestion.evidence
        ? await promoteVenueMiningSourceAction(projectId, {
            type: suggestion.type,
            name: suggestion.name,
            reasoning: suggestion.reasoning,
          })
        : await addDiscoveredSourceAction(projectId, {
            type: suggestion.type,
            name: suggestion.name,
            reasoning: suggestion.reasoning,
          });
      if (result.error) setError(result.error);
      else onAdded();
    });
  }

  function handleDismiss() {
    const sourceId = suggestion.sourceId;
    if (!sourceId) return;
    setError(null);
    startTransition(async () => {
      const result = await dismissVenueMiningCandidateAction(projectId, sourceId);
      if (result.error) setError(result.error);
      else setDismissed(true);
    });
  }

  return (
    <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">
            {formatSourceLabel(suggestion.type, suggestion.name)}
          </h3>
          {suggestion.evidence && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] tracking-wide text-accent">
              {suggestion.evidence.signalCount}/{suggestion.evidence.matchCount} signals
            </span>
          )}
        </div>
        <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground/80">
          {suggestion.reasoning}
        </p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isActive && suggestion.sourceId && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleDismiss}
            className="w-fit rounded-md font-mono text-[11px] tracking-wider uppercase"
          >
            <X className="size-3.5" />
            Dismiss
          </Button>
        )}
        <Button
          type="button"
          variant={isActive ? "outline" : "default"}
          disabled={isActive || isPending}
          onClick={handleAdd}
          className="w-fit rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          {isActive ? (
            <>
              <Check className="size-3.5" />
              {suggestion.alreadyActive ? "Active" : "Added"}
            </>
          ) : isPending ? (
            "Adding…"
          ) : (
            <>
              <Plus className="size-3.5" />
              Add
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
