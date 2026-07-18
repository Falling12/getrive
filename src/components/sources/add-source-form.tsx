"use client";

import { useActionState, useTransition } from "react";
import { HelpCircle, MessageCircle, MessageCircleQuestion, RadioTower, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addRedditSourceAction,
  addStackExchangeSourceAction,
  enableAskMetaFilterAction,
  enableHackerNewsAction,
  enableIndieHackersAction,
} from "@/app/(app)/projects/[projectId]/sources/actions";

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
  const [hnState, setHnState] = useActionState(
    async () => enableHackerNewsAction(projectId),
    {}
  );
  const [ihState, setIhState] = useActionState(
    async () => enableIndieHackersAction(projectId),
    {}
  );
  const [amfState, setAmfState] = useActionState(
    async () => enableAskMetaFilterAction(projectId),
    {}
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-background">
      <header className="flex flex-col gap-3 border-b border-border/60 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
            <Search className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-medium text-foreground">Add a listening source</h2>
            <p className="mt-1 max-w-[68ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
              Enable a channel or add a specific community. Getrive listens only after a source is
              active.
            </p>
          </div>
        </div>
        <span className="w-fit rounded-full border border-border bg-secondary/10 px-3 py-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Shared source limit
        </span>
      </header>

      <div className="divide-y divide-border/60">
        <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
              <RadioTower className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">Hacker News</h3>
                <span className="rounded-sm border border-accent/25 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">
                  {hasHackerNews ? "Active" : "Ready"}
                </span>
              </div>
              <p className="mt-1 max-w-[58ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                One broad public feed. No karma gate, no per-community setup.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Button
              type="button"
              variant={hasHackerNews ? "outline" : "default"}
              disabled={hasHackerNews}
              onClick={() => startTransition(() => setHnState())}
              className="rounded-md font-mono text-[11px] tracking-wider uppercase"
            >
              {hasHackerNews ? "Enabled" : "Enable"}
            </Button>
            {hnState.error && <p className="text-xs text-destructive">{hnState.error}</p>}
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
              <Users className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">IndieHackers</h3>
                <span className="rounded-sm border border-accent/25 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">
                  {hasIndieHackers ? "Active" : "Ready"}
                </span>
              </div>
              <p className="mt-1 max-w-[58ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                One broad public feed. No karma gate, supportive founder-to-founder community.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Button
              type="button"
              variant={hasIndieHackers ? "outline" : "default"}
              disabled={hasIndieHackers}
              onClick={() => startTransition(() => setIhState())}
              className="rounded-md font-mono text-[11px] tracking-wider uppercase"
            >
              {hasIndieHackers ? "Enabled" : "Enable"}
            </Button>
            {ihState.error && <p className="text-xs text-destructive">{ihState.error}</p>}
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
              <MessageCircleQuestion className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium text-foreground">Ask MetaFilter</h3>
                <span className="rounded-sm border border-accent/25 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">
                  {hasAskMetaFilter ? "Active" : "Ready"}
                </span>
              </div>
              <p className="mt-1 max-w-[58ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                One broad public feed. No karma gate, rewards thoughtful and personable answers.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Button
              type="button"
              variant={hasAskMetaFilter ? "outline" : "default"}
              disabled={hasAskMetaFilter}
              onClick={() => startTransition(() => setAmfState())}
              className="rounded-md font-mono text-[11px] tracking-wider uppercase"
            >
              {hasAskMetaFilter ? "Enabled" : "Enable"}
            </Button>
            {amfState.error && <p className="text-xs text-destructive">{amfState.error}</p>}
          </div>
        </div>

        <form action={redditAction} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
              <MessageCircle className="size-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground">Reddit community</h3>
              <p className="mt-1 max-w-[58ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                Add a specific subreddit when the audience fit is strong enough to justify the
                community rules.
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 md:w-[420px]">
            <div className="flex min-w-0 items-center gap-2">
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
              <Button
                type="submit"
                disabled={isRedditPending}
                className="shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
              >
                {isRedditPending ? "Adding…" : "Add"}
              </Button>
            </div>
            {redditState.error && <p className="text-xs text-destructive">{redditState.error}</p>}
            {redditState.success && <p className="font-mono text-xs text-accent">Source added.</p>}
          </div>
        </form>

        <form
          action={stackExchangeAction}
          className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6"
        >
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-secondary/20 text-accent">
              <HelpCircle className="size-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground">Stack Exchange site</h3>
              <p className="mt-1 max-w-[58ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
                Add a specific site (e.g. softwarerecs, superuser, askubuntu) when there&rsquo;s a
                genuine &ldquo;which tool should I use&rdquo; angle for its askers.
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 md:w-[420px]">
            <div className="flex min-w-0 items-center gap-2">
              <input
                name="site"
                placeholder="softwarerecs"
                aria-label="Stack Exchange site slug"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-accent"
              />
              <Button
                type="submit"
                disabled={isStackExchangePending}
                className="shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
              >
                {isStackExchangePending ? "Adding…" : "Add"}
              </Button>
            </div>
            {stackExchangeState.error && (
              <p className="text-xs text-destructive">{stackExchangeState.error}</p>
            )}
            {stackExchangeState.success && (
              <p className="font-mono text-xs text-accent">Source added.</p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
