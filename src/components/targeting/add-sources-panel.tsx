"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { AddSourceForm } from "@/components/sources/add-source-form";
import { AiDiscoveryPanel } from "@/components/sources/ai-discovery-panel";
import { cn } from "@/lib/utils";

type Panel = "manual" | "discovery";

// The old Sources page led with a full-height "Add sources" section before
// showing a single monitored source. Inverted here: the source list leads,
// and adding is two quiet chips that expand on demand — matching how often
// each is actually used.
export function AddSourcesPanel({
  projectId,
  hasHackerNews,
  hasIndieHackers,
  hasAskMetaFilter,
}: {
  projectId: string;
  hasHackerNews: boolean;
  hasIndieHackers: boolean;
  hasAskMetaFilter: boolean;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);

  function chipClass(active: boolean) {
    return cn(
      "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] whitespace-nowrap transition-colors",
      active
        ? "border-accent bg-accent/10 text-accent"
        : "border-dashed border-border/70 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
    );
  }

  return (
    <div data-tour="add-source" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setPanel((p) => (p === "manual" ? null : "manual"))}
          aria-expanded={panel === "manual"}
          className={chipClass(panel === "manual")}
        >
          <Plus className="size-3" /> Add source
        </button>
        <button
          type="button"
          onClick={() => setPanel((p) => (p === "discovery" ? null : "discovery"))}
          aria-expanded={panel === "discovery"}
          className={chipClass(panel === "discovery")}
        >
          <Sparkles className="size-3" /> AI discovery
        </button>
      </div>

      {panel === "manual" && (
        <div className="rounded-lg border border-border/60 p-4 md:p-5">
          <AddSourceForm
            projectId={projectId}
            hasHackerNews={hasHackerNews}
            hasIndieHackers={hasIndieHackers}
            hasAskMetaFilter={hasAskMetaFilter}
          />
        </div>
      )}
      {panel === "discovery" && (
        <div className="rounded-lg border border-border/60 p-4 md:p-5">
          <AiDiscoveryPanel projectId={projectId} />
        </div>
      )}
    </div>
  );
}
