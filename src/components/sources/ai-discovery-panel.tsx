"use client";

import { useState, useTransition } from "react";
import { Sparkles, Plus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  discoverNewSourcesAction,
  addDiscoveredSourceAction,
  type DiscoveredSourceView,
} from "@/app/(app)/projects/[projectId]/sources/actions";
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

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <header className="flex flex-col gap-3 border-b border-border/60 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-medium text-foreground">AI discovery</h2>
            <p className="mt-1 max-w-[68ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
              Ask Getrive to suggest new channels based on your positioning and ICP — you choose
              which ones to add.
            </p>
          </div>
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
              {suggestions ? "Discover again" : "Run AI discovery"}
            </>
          )}
        </Button>
      </header>

      {error && <p className="p-5 font-mono text-xs text-destructive md:p-6">{error}</p>}

      {suggestions && suggestions.length === 0 && !error && (
        <p className="p-5 font-mono text-xs text-muted-foreground md:p-6">
          No new suggestions beyond what you&apos;re already monitoring.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="divide-y divide-border/60">
          {suggestions.map((suggestion) => (
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
      )}
    </section>
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
  const isActive = suggestion.alreadyActive || added;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addDiscoveredSourceAction(projectId, {
        type: suggestion.type,
        name: suggestion.name,
        reasoning: suggestion.reasoning,
      });
      if (result.error) setError(result.error);
      else onAdded();
    });
  }

  return (
    <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-foreground">
          {formatSourceLabel(suggestion.type, suggestion.name)}
        </h3>
        <p className="mt-1 max-w-[58ch] text-[13px] leading-relaxed text-muted-foreground/80">
          {suggestion.reasoning}
        </p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <Button
        type="button"
        variant={isActive ? "outline" : "default"}
        disabled={isActive || isPending}
        onClick={handleAdd}
        className="w-fit shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
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
  );
}
