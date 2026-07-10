"use client";

import { useActionState, useMemo, useState } from "react";
import { AtSign, CheckCircle2, LockKeyhole, Mic, RadioTower, Search } from "lucide-react";
import type { SourceType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatSourceLabel } from "@/lib/sources/format";
import { confirmSourcesAction, type SourceSuggestionView } from "@/app/onboarding/actions";

const CHANNEL_META: Record<
  SourceType,
  { label: string; detail: string; icon: typeof RadioTower; order: number }
> = {
  HACKERNEWS: {
    label: "Hacker News",
    detail: "Public feed, no access setup, no karma gate. Usually the fastest first listening node for technical founders.",
    icon: RadioTower,
    order: 0,
  },
  REDDIT_SUBREDDIT: {
    label: "Reddit communities",
    detail: "Specific communities with stronger fit, but some require karma-building before a founder can safely reply.",
    icon: Search,
    order: 1,
  },
  TWITTER_SEARCH: {
    label: "Twitter/X",
    detail: "Potentially useful for named-person discovery, but monitoring is paused until API access and cost are confirmed.",
    icon: AtSign,
    order: 2,
  },
};

function priorityLabel(priority: number) {
  if (priority === 1) return "Start here";
  if (priority === 2) return "Second pass";
  return "Setup later";
}

export function OnboardingResults({
  productId,
  suggestions,
}: {
  productId: string;
  suggestions: SourceSuggestionView[];
}) {
  const [state, formAction, isPending] = useActionState(confirmSourcesAction, {});
  const defaultSelected = useMemo(
    () => new Set(suggestions.filter((s) => s.selectable && s.priority <= 2).map((s) => s.id)),
    [suggestions]
  );
  const [selected, setSelected] = useState<Set<string>>(defaultSelected);

  const grouped = useMemo(() => {
    return Object.entries(
      suggestions.reduce(
        (acc, suggestion) => {
          (acc[suggestion.type] ??= []).push(suggestion);
          return acc;
        },
        {} as Record<SourceType, SourceSuggestionView[]>
      )
    )
      .map(([type, items]) => ({
        type: type as SourceType,
        items: items.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => CHANNEL_META[a.type].order - CHANNEL_META[b.type].order);
  }, [suggestions]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectableCount = suggestions.filter((s) => s.selectable).length;

  return (
    <form action={formAction} className="flex w-full flex-1 flex-col pb-32">
      <input type="hidden" name="productId" value={productId} />
      <header className="mb-10 lg:mb-12">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="size-3.5 text-accent" />
          <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
            Channel plan generated
          </span>
        </div>
        <h1 className="mb-2 text-3xl font-medium tracking-tight text-foreground">
          Activate your first sources
        </h1>
        <p className="max-w-lg font-mono text-xs leading-relaxed text-muted-foreground">
          Getrive ranked the channels for your ICP. Start with the lowest-friction nodes, keep
          Reddit where the fit is strongest, and leave setup-dependent channels parked for now.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {grouped.map(({ type, items }) => {
          const meta = CHANNEL_META[type];
          const Icon = meta.icon;
          const minPriority = Math.min(...items.map((item) => item.priority));

          return (
            <section
              key={type}
              className="overflow-hidden rounded-xl bg-background shadow-[inset_0_0_0_1px_var(--border)]"
            >
              <div className="flex flex-col gap-3 border-b border-border/60 p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded border border-border bg-secondary/30 text-accent">
                      <Icon className="size-4" />
                    </span>
                    <div className="flex flex-col gap-1">
                      <h2 className="text-lg font-medium text-foreground">{meta.label}</h2>
                      <p className="max-w-[58ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {meta.detail}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-[10px] tracking-widest text-accent uppercase">
                    {priorityLabel(minPriority)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-border/50">
                {items.map((suggestion) => {
                  const isChecked = selected.has(suggestion.id);
                  const isLocked = !suggestion.selectable;

                  return (
                    <label
                      key={suggestion.id}
                      className={cn(
                        "group relative flex items-start gap-4 p-5 transition-colors md:p-6",
                        isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-secondary/10",
                        isChecked && "bg-primary/5"
                      )}
                    >
                      {isLocked ? (
                        <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded border border-border text-muted-foreground">
                          <LockKeyhole className="size-3" />
                        </span>
                      ) : (
                        <Checkbox
                          name="sourceIds"
                          value={suggestion.id}
                          checked={isChecked}
                          onCheckedChange={() => toggle(suggestion.id)}
                          className="mt-1 size-5 shrink-0 rounded-[4px]"
                        />
                      )}

                      <div className="flex flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-sans text-base font-medium text-foreground">
                            {formatSourceLabel(suggestion.type, suggestion.name)}
                          </span>
                          {suggestion.selectable && suggestion.priority <= 2 && (
                            <span className="rounded-sm border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">
                              Recommended
                            </span>
                          )}
                          {isChecked && (
                            <span className="rounded-sm border border-border bg-secondary/20 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                              Selected
                            </span>
                          )}
                          {isLocked && (
                            <span className="rounded-sm border border-dashed border-border px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                              API setup required
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                          {suggestion.reasoning}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {state.error && <p className="mt-6 text-sm font-medium text-destructive">{state.error}</p>}

      <div className="fixed right-0 bottom-0 z-50 flex w-full items-center justify-between border-t border-border bg-background/90 p-6 backdrop-blur-lg md:w-[calc(100%-320px)] lg:w-[calc(100%-380px)] lg:px-12">
        <div className="flex flex-col">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Active sources
          </span>
          <span className="font-sans text-lg font-medium text-foreground">
            {selected.size} / {selectableCount}
          </span>
        </div>
        <Button
          type="submit"
          disabled={selected.size === 0 || isPending}
          size="lg"
          className="h-12 gap-2 rounded-md px-6 text-sm lg:px-8"
        >
          {isPending ? "Starting…" : "Start listening"}
          <Mic className="size-4" />
        </Button>
      </div>
    </form>
  );
}
