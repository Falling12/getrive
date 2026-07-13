"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Only rendered when the Signals page's status filter is "all" — mixing
// not-replied/replied/dismissed signals into one flat list buried the
// actionable ones under old history. Not-replied opens expanded by
// default (that's the actual work queue); Replied/Dismissed start
// collapsed since they're reference, not action items.
export function SignalGroup({
  label,
  count,
  defaultOpen,
  children,
}: {
  label: string;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 self-start font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        {label}
        <span className="text-muted-foreground/60">({count})</span>
      </button>
      {open && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  );
}
