"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TargetingModuleState = "good" | "attention" | "neutral";

export interface TargetingModule {
  id: string;
  label: string;
  readout: string;
  caption: string;
  state: TargetingModuleState;
  content: ReactNode;
}

// v2 layout experiment: Targeting as one fused instrument strip — three
// modules sharing borders like gauges on a single physical console, each
// with a recessed numeral readout instead of a text label — rather than
// three separate cards (v1) or a side-scrolling board (the previous v2
// draft). Pressing a module opens one shared drawer beneath the strip;
// pressing the open module again closes it. Nothing here implies a forced
// sequence — a founder can leave everything collapsed and just read the
// three readouts, which is the point when nothing needs a second look.
export function ControlDeck({
  modules,
  defaultOpenId,
}: {
  modules: TargetingModule[];
  defaultOpenId: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);
  const restoredFromHash = useRef(false);

  useEffect(() => {
    if (restoredFromHash.current) return;
    restoredFromHash.current = true;
    const hash = window.location.hash.slice(1);
    if (hash && modules.some((m) => m.id === hash)) {
      // One-time sync from the URL (unavailable during SSR) on mount only —
      // the ref guard means this never re-fires, so it's not a cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenId(hash);
    }
  }, [modules]);

  function toggle(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    window.history.replaceState(null, "", next ? `#${next}` : window.location.pathname + window.location.search);
  }

  const activeModule = modules.find((m) => m.id === openId) ?? null;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 sm:flex-row">
        {modules.map((module, index) => {
          const isOpen = module.id === openId;
          return (
            <button
              key={module.id}
              type="button"
              aria-expanded={isOpen}
              aria-controls="targeting-deck-drawer"
              onClick={() => toggle(module.id)}
              className={cn(
                "group flex flex-1 flex-col items-center gap-3 border-border/60 px-6 py-6 text-center transition-colors",
                index > 0 && "border-t sm:border-t-0 sm:border-l",
                "border-b-2",
                isOpen
                  ? cn(
                      "bg-secondary/30",
                      module.state === "attention"
                        ? "border-b-destructive"
                        : module.state === "good"
                          ? "border-b-accent"
                          : "border-b-muted-foreground/50"
                    )
                  : "border-b-transparent hover:bg-secondary/10"
              )}
            >
              <span className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                {module.label}
              </span>
              <span
                className={cn(
                  "flex h-14 min-w-14 items-center justify-center rounded-md border bg-background px-3 font-mono text-2xl tabular-nums shadow-[inset_0_2px_6px_rgba(0,0,0,0.35)]",
                  module.state === "attention"
                    ? "border-destructive/50 text-destructive"
                    : module.state === "good"
                      ? "border-accent/40 text-accent"
                      : "border-border text-muted-foreground/70"
                )}
              >
                {module.readout}
              </span>
              <span className="line-clamp-1 max-w-full font-mono text-[11px] text-muted-foreground">
                {module.caption}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
        style={{ gridTemplateRows: activeModule ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden pt-6">
          <div
            id="targeting-deck-drawer"
            role="region"
            aria-label={activeModule?.label}
            className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-secondary/[0.06] p-5 sm:p-6"
          >
            {activeModule?.content}
          </div>
        </div>
      </div>
    </div>
  );
}
