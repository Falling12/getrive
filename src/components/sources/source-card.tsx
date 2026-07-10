"use client";

import { useActionState, useTransition } from "react";
import { ArrowUpRight, Shield, Users, ScrollText, TrendingUp, AlertTriangle } from "lucide-react";
import type { KarmaStatus, SourceType } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KarmaStatusBadge } from "@/components/sources/karma-status-badge";
import { formatRelativeTime } from "@/lib/format";
import { formatSourceLabel } from "@/lib/sources/format";
import { CONSECUTIVE_FAILURE_ALERT_THRESHOLD } from "@/lib/limits";
import {
  unmonitorSourceAction,
  updateKarmaStatusAction,
  updateSourceDetailsAction,
} from "@/app/(app)/projects/[projectId]/sources/actions";

export interface KarmaBuilderPost {
  title: string;
  permalink: string;
}

export function SourceCard({
  projectId,
  id,
  type,
  name,
  status,
  karmaThreshold,
  currentKarma,
  selfPromoNotes,
  usersAcquired,
  karmaBuilders,
  lastSuccessfulPollAt,
  consecutiveFailures,
}: {
  projectId: string;
  id: string;
  type: SourceType;
  name: string;
  status: KarmaStatus;
  karmaThreshold: number | null;
  currentKarma: number;
  selfPromoNotes: string | null;
  usersAcquired: number;
  karmaBuilders: KarmaBuilderPost[];
  lastSuccessfulPollAt: Date | null;
  consecutiveFailures: number;
}) {
  const isReddit = type === "REDDIT_SUBREDDIT";
  const externalHref =
    type === "REDDIT_SUBREDDIT"
      ? `https://www.reddit.com/r/${name}`
      : type === "HACKERNEWS"
        ? "https://news.ycombinator.com/newest"
        : null;
  const isFailing = consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD;
  const [, startTransition] = useTransition();
  const boundDetailsAction = updateSourceDetailsAction.bind(null, projectId, id);
  const [state, formAction, isPending] = useActionState(boundDetailsAction, {});
  const label = formatSourceLabel(type, name);

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-xl border border-border bg-background/80 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.2)] backdrop-blur-sm">
      <div className="flex flex-col gap-2 border-b border-border/60 bg-gradient-to-r from-secondary/20 to-transparent p-5 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-medium text-foreground">{label}</h2>
            {externalHref && (
              <a
                href={externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground/60 transition-colors hover:text-accent"
              >
                <ArrowUpRight className="size-4" />
              </a>
            )}
          </div>
          {isReddit ? (
            <KarmaStatusBadge status={status} />
          ) : (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-[10px] tracking-widest text-accent uppercase">
              Ready
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/70">
          Last successful poll:{" "}
          {lastSuccessfulPollAt ? formatRelativeTime(lastSuccessfulPollAt) : "never"}
        </span>
      </div>

      {isFailing && (
        <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/10 px-5 py-3 md:px-6">
          <AlertTriangle className="size-4 shrink-0 text-destructive" />
          <p className="font-mono text-xs text-destructive">
            {`Ingestion failing — ${consecutiveFailures} failed fetch attempts in a row. Signals from this source have stopped; this isn't just a quiet day.`}
          </p>
        </div>
      )}

      <form action={formAction}>
        <div className="grid grid-cols-1 gap-px bg-border/60 md:grid-cols-4">
          {isReddit && (
            <div className="flex flex-col gap-2 bg-background p-5 md:px-6">
              <Label className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <Shield className="size-3.5" /> Karma threshold
              </Label>
              <input
                name="karmaThreshold"
                type="number"
                min={0}
                defaultValue={karmaThreshold ?? undefined}
                className="w-20 rounded border border-border bg-secondary/10 px-2 py-1.5 font-mono text-lg text-foreground outline-none transition-colors focus:border-accent"
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
          )}

          <div className="flex flex-col gap-2 bg-background p-5 md:px-6">
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              <Users className="size-3.5" /> Users acquired
            </span>
            <span className="text-3xl font-medium tracking-tight text-foreground">
              {usersAcquired}
            </span>
          </div>

          {isReddit && (
            <div className="col-span-1 flex flex-col gap-2 bg-background p-5 md:col-span-2 md:px-6">
              <Label className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <ScrollText className="size-3.5" /> Self-promo rules
              </Label>
              <textarea
                name="selfPromoNotes"
                rows={2}
                defaultValue={selfPromoNotes ?? ""}
                placeholder="e.g. one self-promo thread per month, mods are strict about direct links…"
                className="w-full resize-none rounded border border-transparent bg-transparent text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-border focus:bg-secondary/10"
              />
            </div>
          )}

          {!isReddit && (
            <div className="col-span-1 flex flex-col justify-center gap-1 bg-background p-5 md:col-span-3 md:px-6">
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                This channel has no per-community karma status to maintain — Getrive treats it as
                ready when monitoring is enabled.
              </p>
            </div>
          )}
        </div>

        {karmaBuilders.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border/60 bg-secondary/5 p-5 md:px-6">
            <div className="mb-1 flex items-center gap-2">
              <TrendingUp className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Karma builders
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {karmaBuilders.map((post) => (
                <a
                  key={post.permalink}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded border border-border/60 bg-background p-3 transition-colors hover:border-accent/50 hover:bg-secondary/10"
                >
                  <span className="mr-4 truncate text-sm text-foreground/90">{post.title}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border/60 bg-secondary/5 p-4">
          {state.error && <p className="mr-auto text-sm text-destructive">{state.error}</p>}
          {state.success && <p className="mr-auto font-mono text-xs text-accent">Saved.</p>}
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => unmonitorSourceAction(projectId, id))}
            className="rounded-md font-mono text-[11px] tracking-wider text-muted-foreground uppercase"
          >
            Stop monitoring
          </Button>
          {isReddit && status !== "READY" && (
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => startTransition(() => updateKarmaStatusAction(projectId, id, "READY"))}
              className="rounded-md font-mono text-[11px] tracking-wider uppercase"
            >
              Mark ready (override)
            </Button>
          )}
          {isReddit && (
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-md font-mono text-[11px] tracking-wider uppercase"
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </form>
    </article>
  );
}
