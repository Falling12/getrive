"use client";

import { useActionState, useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addRedditSourceAction,
  addStackExchangeSourceAction,
  enableAskMetaFilterAction,
  enableHackerNewsAction,
  enableIndieHackersAction,
} from "@/app/(app)/projects/[projectId]/sources/actions";

const BROAD_FEEDS = [
  { key: "hn", label: "Hacker News" },
  { key: "ih", label: "IndieHackers" },
  { key: "amf", label: "Ask MetaFilter" },
] as const;

function BroadFeedChip({
  label,
  active,
  isPending,
  onEnable,
}: {
  label: string;
  active: boolean;
  isPending: boolean;
  onEnable: () => void;
}) {
  return (
    <button
      type="button"
      disabled={active || isPending}
      onClick={onEnable}
      className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/10 px-3 py-1.5 font-mono text-[11px] tracking-wide text-foreground transition-colors not-disabled:hover:border-accent/50 disabled:cursor-default"
    >
      {active ? (
        <Check className="size-3 text-accent" />
      ) : isPending ? (
        <Loader2 className="size-3 animate-spin text-muted-foreground" />
      ) : (
        <Plus className="size-3 text-muted-foreground" />
      )}
      {label}
      <span
        className={`font-mono text-[9px] tracking-widest uppercase ${active ? "text-accent" : "text-muted-foreground/60"}`}
      >
        {active ? "on" : "off"}
      </span>
    </button>
  );
}

// The three zero-config feeds (no per-item settings, no input needed — see
// AGENTS.md's channel comparison) collapse into one row of toggle chips
// instead of three full description-plus-button rows: once a founder has
// enabled all three, that used to be three "Active" cards permanently
// taking a screen's worth of space for nothing left to do. Reddit and Stack
// Exchange keep their own input rows below since those genuinely need one.
export function AddSourceForm({
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
  const [, startTransition] = useTransition();
  const [redditState, redditAction, isRedditPending] = useActionState(
    addRedditSourceAction.bind(null, projectId),
    {}
  );
  const [stackExchangeState, stackExchangeAction, isStackExchangePending] = useActionState(
    addStackExchangeSourceAction.bind(null, projectId),
    {}
  );
  const [hnState, setHnState, isHnPending] = useActionState(
    async () => enableHackerNewsAction(projectId),
    {}
  );
  const [ihState, setIhState, isIhPending] = useActionState(
    async () => enableIndieHackersAction(projectId),
    {}
  );
  const [amfState, setAmfState, isAmfPending] = useActionState(
    async () => enableAskMetaFilterAction(projectId),
    {}
  );
  const broadFeedError = hnState.error ?? ihState.error ?? amfState.error;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          Broad feeds
        </h3>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground/80">
          No per-community setup — flip one on and Getrive listens immediately.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BROAD_FEEDS.map(({ key, label }) => {
            const active = key === "hn" ? hasHackerNews : key === "ih" ? hasIndieHackers : hasAskMetaFilter;
            const isPending = key === "hn" ? isHnPending : key === "ih" ? isIhPending : isAmfPending;
            const onEnable = () =>
              startTransition(() => (key === "hn" ? setHnState() : key === "ih" ? setIhState() : setAmfState()));
            return (
              <BroadFeedChip
                key={key}
                label={label}
                active={active}
                isPending={isPending}
                onEnable={onEnable}
              />
            );
          })}
        </div>
        {broadFeedError && <p className="mt-2 text-xs text-destructive">{broadFeedError}</p>}
      </div>

      <div className="flex flex-col gap-4 border-t border-border/60 pt-5">
        <h3 className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          Specific communities
        </h3>

        <form action={redditAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-secondary/10 transition-colors focus-within:border-accent">
            <span className="border-r border-border bg-secondary/20 px-3 py-2 font-mono text-xs text-muted-foreground">
              r/
            </span>
            <input
              name="name"
              placeholder="saas"
              aria-label="Subreddit name"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex items-start gap-2">
            <Button
              type="submit"
              disabled={isRedditPending}
              className="shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
            >
              {isRedditPending ? "Adding…" : "Add subreddit"}
            </Button>
          </div>
          {redditState.error && (
            <p className="text-xs text-destructive sm:col-span-2">{redditState.error}</p>
          )}
          {redditState.success && (
            <p className="font-mono text-xs text-accent sm:col-span-2">Source added.</p>
          )}
        </form>

        <form
          action={stackExchangeAction}
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
        >
          <input
            name="site"
            placeholder="Stack Exchange site, e.g. softwarerecs"
            aria-label="Stack Exchange site slug"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
          />
          <Button
            type="submit"
            disabled={isStackExchangePending}
            className="shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
          >
            {isStackExchangePending ? "Adding…" : "Add site"}
          </Button>
          {stackExchangeState.error && (
            <p className="text-xs text-destructive sm:col-span-2">{stackExchangeState.error}</p>
          )}
          {stackExchangeState.success && (
            <p className="font-mono text-xs text-accent sm:col-span-2">Source added.</p>
          )}
        </form>
      </div>
    </div>
  );
}
