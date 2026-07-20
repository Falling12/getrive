"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { VenueMiningPanel, type VenueMiningRowData } from "@/components/search/venue-mining-panel";

// Collapsed by default, same pattern as the feed's below-threshold section —
// venue candidates are worth a look occasionally, not on every visit.
export function VenueMiningDisclosure({
  projectId,
  candidates,
}: {
  projectId: string;
  candidates: VenueMiningRowData[];
}) {
  const [open, setOpen] = useState(false);
  if (candidates.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-border/60 pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 self-start font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        {candidates.length} communit{candidates.length === 1 ? "y" : "ies"} noticed — worth adding as a source?
      </button>
      {open && <VenueMiningPanel projectId={projectId} candidates={candidates} />}
    </div>
  );
}
