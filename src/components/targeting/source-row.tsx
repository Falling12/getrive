"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertTriangle, ArrowUpRight, ChevronDown, ScrollText, Shield, Users } from "lucide-react";
import type { SourceType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { formatSourceLabel, stackExchangeSiteDomain } from "@/lib/sources/format";
import {
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD,
} from "@/lib/limits";
import {
  unmonitorSourceAction,
  updateSourceDetailsAction,
} from "@/app/(app)/projects/[projectId]/sources/actions";

// The old full-width SourceCard, collapsed to one row per source so the
// whole channel mix reads in a glance: health dot, name, inline vitals.
// Expanding a row reveals the same per-source controls the card had —
// karma threshold, self-promo notes, stop monitoring — nothing was lost,
// it just stopped costing a screen per source.
export function SourceRow({
  projectId,
  id,
  type,
  name,
  karmaThreshold,
  currentKarma,
  selfPromoNotes,
  usersAcquired,
  lastSuccessfulPollAt,
  consecutiveFailures,
  consecutiveEmptyPolls,
}: {
  projectId: string;
  id: string;
  type: SourceType;
  name: string;
  karmaThreshold: number | null;
  currentKarma: number;
  selfPromoNotes: string | null;
  usersAcquired: number;
  lastSuccessfulPollAt: Date | null;
  consecutiveFailures: number;
  consecutiveEmptyPolls: number;
}) {
  const [open, setOpen] = useState(false);
  const isReddit = type === "REDDIT_SUBREDDIT";
  const externalHref =
    type === "REDDIT_SUBREDDIT"
      ? `https://www.reddit.com/r/${name}`
      : type === "HACKERNEWS"
        ? "https://news.ycombinator.com/newest"
        : type === "INDIEHACKERS"
          ? "https://www.indiehackers.com"
          : type === "STACKEXCHANGE"
            ? `https://${stackExchangeSiteDomain(name)}`
            : type === "ASKMETAFILTER"
              ? "https://ask.metafilter.com"
              : null;
  const isFailing = consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD;
  const isEmptyPolling =
    !isFailing && consecutiveEmptyPolls >= CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD;
  const isHealthy = !isFailing && !isEmptyPolling;
  const [, startTransition] = useTransition();
  const boundDetailsAction = updateSourceDetailsAction.bind(null, projectId, id);
  const [state, formAction, isPending] = useActionState(boundDetailsAction, {});
  const label = formatSourceLabel(type, name);

  const vitals = [
    ...(isReddit ? [`karma ${currentKarma}`] : []),
    `${usersAcquired} acquired`,
    lastSuccessfulPollAt ? `polled ${formatRelativeTime(lastSuccessfulPollAt)}` : "never polled",
  ].join(" · ");

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 pr-3 pl-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="group flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
        >
          <span
            className={cn("size-2 shrink-0 rounded-full", isHealthy ? "bg-accent" : "bg-destructive")}
            aria-label={isHealthy ? "Healthy" : "Needs attention"}
          />
          <span className="max-w-[55%] shrink-0 truncate text-sm font-medium text-foreground">
            {label}
          </span>
          <span
            className={cn(
              "hidden min-w-0 flex-1 truncate text-right font-mono text-[10px] sm:block",
              isHealthy ? "text-muted-foreground/70" : "text-destructive"
            )}
          >
            {isFailing
              ? `${consecutiveFailures} failed polls`
              : isEmptyPolling
                ? `${consecutiveEmptyPolls} empty polls`
                : vitals}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:text-foreground",
              open && "rotate-180"
            )}
          />
        </button>
        {externalHref && (
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${label}`}
            className="shrink-0 p-1.5 text-muted-foreground/50 transition-colors hover:text-accent"
          >
            <ArrowUpRight className="size-4" />
          </a>
        )}
      </div>

      {open && (
        <div className="border-t border-border/40 bg-secondary/5">
          {isFailing && (
            <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5">
              <AlertTriangle className="size-4 shrink-0 text-destructive" />
              <p className="font-mono text-xs text-destructive">
                {`Ingestion failing — ${consecutiveFailures} failed fetch attempts in a row. Signals from this source have stopped; this isn't just a quiet day.`}
              </p>
            </div>
          )}

          {isEmptyPolling && (
            <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2.5">
              <AlertTriangle className="size-4 shrink-0 text-destructive" />
              <p className="font-mono text-xs text-destructive">
                {`Fetching but finding nothing — ${consecutiveEmptyPolls} polls in a row returned 0 posts, not just 0 relevant ones. Likely a silent no-op, not a quiet day.`}
              </p>
            </div>
          )}

          <form action={formAction}>
            {isReddit && (
              <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-[auto_1fr] md:gap-8">
                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    <Shield className="size-3.5" /> Karma threshold
                  </Label>
                  <input
                    name="karmaThreshold"
                    type="number"
                    min={0}
                    defaultValue={karmaThreshold ?? undefined}
                    className="w-20 rounded border border-border bg-secondary/10 px-2 py-1.5 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent"
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Current karma:{" "}
                    <input
                      name="currentKarma"
                      type="number"
                      defaultValue={currentKarma}
                      className="w-14 rounded border border-transparent bg-transparent text-foreground outline-none focus:border-accent"
                    />
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    <ScrollText className="size-3.5" /> Self-promo rules
                  </Label>
                  <textarea
                    name="selfPromoNotes"
                    rows={2}
                    defaultValue={selfPromoNotes ?? ""}
                    placeholder="e.g. one self-promo thread per month, mods are strict about direct links…"
                    className="w-full resize-none rounded border border-border/60 bg-transparent px-2 py-1.5 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-accent focus:bg-secondary/10"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-border/40 px-4 py-3">
              {!isReddit && (
                <span className="mr-auto flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <Users className="size-3" />
                  {usersAcquired} acquired
                </span>
              )}
              {state.error && <p className="mr-auto text-sm text-destructive">{state.error}</p>}
              {state.success && <p className="mr-auto font-mono text-xs text-accent">Saved.</p>}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => startTransition(() => unmonitorSourceAction(projectId, id))}
                className="rounded-md font-mono text-[10px] tracking-wider text-muted-foreground uppercase"
              >
                Stop monitoring
              </Button>
              {isReddit && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="rounded-md font-mono text-[10px] tracking-wider uppercase"
                >
                  {isPending ? "Saving…" : "Save"}
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
