"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { formatSourceLabel, stackExchangeSiteDomain } from "@/lib/sources/format";
import {
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD,
} from "@/lib/limits";
import type { SourceType } from "@/generated/prisma/client";
import {
  unmonitorSourceAction,
  updateSourceDetailsAction,
  addRedditSourceAction,
  addStackExchangeSourceAction,
  enableHackerNewsAction,
  enableIndieHackersAction,
  enableAskMetaFilterAction,
  discoverNewSourcesAction,
  addDiscoveredSourceAction,
  type DiscoveredSourceView,
} from "@/app/(app)/projects/[projectId]/sources/actions";
import {
  promoteVenueMiningSourceAction,
  dismissVenueMiningCandidateAction,
} from "@/app/(app)/projects/[projectId]/search/actions";
import { useDiscoveryState, setDiscoveryState, getDiscoveryState } from "@/lib/sources/discovery-store";
import { Checkbox, SectionLabel, StatusDot, TextAction } from "@/components/targeting/v2/kit";

export interface TargetingSourceRow {
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
}

const inputClass =
  "w-full rounded-md bg-secondary/15 px-3 py-2 text-sm text-foreground outline-none ring-1 ring-transparent transition-shadow focus:ring-accent";

function externalHrefFor(type: SourceType, name: string): string | null {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return `https://www.reddit.com/r/${name}`;
    case "HACKERNEWS":
      return "https://news.ycombinator.com/newest";
    case "INDIEHACKERS":
      return "https://www.indiehackers.com";
    case "STACKEXCHANGE":
      return `https://${stackExchangeSiteDomain(name)}`;
    case "ASKMETAFILTER":
      return "https://ask.metafilter.com";
  }
}

function toneFor(source: TargetingSourceRow): "good" | "attention" {
  const isFailing = source.consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD;
  const isEmptyPolling = !isFailing && source.consecutiveEmptyPolls >= CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD;
  return isFailing || isEmptyPolling ? "attention" : "good";
}

// Sources read as a wall of tokens (name + health), not a stacked list —
// pick one and its full detail (vitals, karma/self-promo editing, stop
// monitoring) opens in a single shared panel underneath, so the wall stays
// scannable even with a dozen sources monitored at once.
export function SourcesTargetingPanel({
  projectId,
  sources,
  hasHackerNews,
  hasIndieHackers,
  hasAskMetaFilter,
}: {
  projectId: string;
  sources: TargetingSourceRow[];
  hasHackerNews: boolean;
  hasIndieHackers: boolean;
  hasAskMetaFilter: boolean;
}) {
  const firstAttention = sources.find((s) => toneFor(s) === "attention");
  const [focusedId, setFocusedId] = useState<string | null>(firstAttention?.id ?? null);
  const focused = sources.find((s) => s.id === focusedId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div data-tour="source-list" className="flex flex-col gap-2">
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sources yet — add one below.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sources.map((source) => {
              const tone = toneFor(source);
              const isFocused = source.id === focusedId;
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => setFocusedId(isFocused ? null : source.id)}
                  aria-pressed={isFocused}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    isFocused
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                  )}
                >
                  <StatusDot tone={tone} />
                  {formatSourceLabel(source.type, source.name)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {focused && <SourceDetail key={focused.id} projectId={projectId} source={focused} />}

      <AddSources
        projectId={projectId}
        hasHackerNews={hasHackerNews}
        hasIndieHackers={hasIndieHackers}
        hasAskMetaFilter={hasAskMetaFilter}
      />
    </div>
  );
}

function SourceDetail({ projectId, source }: { projectId: string; source: TargetingSourceRow }) {
  const {
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
  } = source;
  const isReddit = type === "REDDIT_SUBREDDIT";
  const externalHref = externalHrefFor(type, name);
  const isFailing = consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD;
  const isEmptyPolling = !isFailing && consecutiveEmptyPolls >= CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD;
  const [, startTransition] = useTransition();
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: boolean }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setResult({});
    const outcome = await updateSourceDetailsAction(projectId, id, {}, new FormData(event.currentTarget));
    setResult(outcome);
    setIsPending(false);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-secondary/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">{formatSourceLabel(type, name)}</span>
          {externalHref && (
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Open source"
            >
              <ArrowUpRight className="size-4" />
            </a>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {usersAcquired} acquired
          {lastSuccessfulPollAt
            ? ` · polled ${formatRelativeTime(lastSuccessfulPollAt)}`
            : " · never polled"}
        </span>
      </div>

      {(isFailing || isEmptyPolling) && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            {isFailing
              ? `Ingestion failing — ${consecutiveFailures} failed fetch attempts in a row. Signals have stopped.`
              : `Fetching but finding nothing — ${consecutiveEmptyPolls} polls in a row returned 0 posts.`}
          </p>
        </div>
      )}

      {isReddit && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Karma threshold</span>
              <input name="karmaThreshold" type="number" min={0} defaultValue={karmaThreshold ?? undefined} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">Current karma</span>
              <input name="currentKarma" type="number" defaultValue={currentKarma} className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted-foreground">Self-promo rules</span>
            <textarea
              name="selfPromoNotes"
              rows={2}
              defaultValue={selfPromoNotes ?? ""}
              placeholder="e.g. one self-promo thread per month, mods are strict about direct links…"
              className={cn(inputClass, "resize-none leading-relaxed")}
            />
          </label>
          <div className="flex items-center justify-between">
            <TextAction
              tone="destructive"
              type="button"
              onClick={() => startTransition(() => unmonitorSourceAction(projectId, id))}
            >
              Stop monitoring
            </TextAction>
            <div className="flex items-center gap-3">
              {result.error && <span className="text-sm text-destructive">{result.error}</span>}
              {result.success && <span className="text-xs text-accent">Saved.</span>}
              <Button type="submit" size="sm" disabled={isPending} className="rounded-md">
                {isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </form>
      )}

      {!isReddit && (
        <TextAction
          tone="destructive"
          className="self-start"
          onClick={() => startTransition(() => unmonitorSourceAction(projectId, id))}
        >
          Stop monitoring
        </TextAction>
      )}
    </div>
  );
}

const BROAD_FEEDS = [
  { key: "hn", label: "Hacker News" },
  { key: "ih", label: "IndieHackers" },
  { key: "amf", label: "Ask MetaFilter" },
] as const;

function AddSources({
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
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [broadFeedError, setBroadFeedError] = useState<string | null>(null);

  function enable(key: string) {
    setPendingKey(key);
    setBroadFeedError(null);
    const action = key === "hn" ? enableHackerNewsAction : key === "ih" ? enableIndieHackersAction : enableAskMetaFilterAction;
    action(projectId).then((result) => {
      setPendingKey(null);
      if (result.error) setBroadFeedError(result.error);
    });
  }

  return (
    <div data-tour="add-source" className="flex flex-col gap-6 rounded-2xl bg-secondary/10 p-5">
      <div className="flex flex-col gap-2">
        <SectionLabel>Broad feeds</SectionLabel>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {BROAD_FEEDS.map(({ key, label }) => {
            const active = key === "hn" ? hasHackerNews : key === "ih" ? hasIndieHackers : hasAskMetaFilter;
            const isPending = pendingKey === key;
            return (
              <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                {isPending ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <Checkbox checked={active} disabled={active || isPending} onChange={() => enable(key)} />
                )}
                {label}
              </label>
            );
          })}
        </div>
        {broadFeedError && <p className="text-sm text-destructive">{broadFeedError}</p>}
      </div>

      <div className="border-t border-border/60 pt-5">
        <ManualAddForm projectId={projectId} />
      </div>
      <div className="border-t border-border/60 pt-5">
        <AiDiscovery projectId={projectId} />
      </div>
    </div>
  );
}

function ManualAddForm({ projectId }: { projectId: string }) {
  const [kind, setKind] = useState<"reddit" | "stackexchange">("reddit");
  const [value, setValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: boolean }>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setResult({});
    const formData = new FormData();
    formData.set(kind === "reddit" ? "name" : "site", value);
    const action = kind === "reddit" ? addRedditSourceAction : addStackExchangeSourceAction;
    const outcome = await action(projectId, {}, formData);
    setResult(outcome);
    setIsPending(false);
    if (outcome.success) setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <SectionLabel>Add a community</SectionLabel>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="rounded-md bg-secondary/15 px-2.5 py-2 text-sm text-foreground outline-none"
        >
          <option value="reddit">Subreddit</option>
          <option value="stackexchange">Stack Exchange site</option>
        </select>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={kind === "reddit" ? "saas" : "softwarerecs"}
          className={cn(inputClass, "min-w-0 flex-1")}
        />
        <Button type="submit" size="sm" disabled={isPending || !value.trim()} className="shrink-0 rounded-md">
          {isPending ? "Adding…" : "Add"}
        </Button>
      </div>
      {result.error && <p className="text-sm text-destructive">{result.error}</p>}
      {result.success && <p className="text-xs text-accent">Source added.</p>}
    </form>
  );
}

function suggestionKey(s: { type: string; name: string }) {
  return `${s.type}:${s.name}`;
}

// Hacker News, IndieHackers, and Ask MetaFilter are single always-on
// feeds toggled directly above (see BROAD_FEEDS) — there's no judgment
// call for the AI to make about whether to monitor "Hacker News," so a
// scan only surfaces the two source types that actually need picking a
// specific community: subreddits and Stack Exchange sites.
const DISCOVERABLE_TYPES: ReadonlySet<SourceType> = new Set(["REDDIT_SUBREDDIT", "STACKEXCHANGE"]);

function AiDiscovery({ projectId }: { projectId: string }) {
  const { status, suggestions: rawSuggestions, error, addedKeys } = useDiscoveryState(projectId);
  const suggestions = rawSuggestions?.filter((s) => DISCOVERABLE_TYPES.has(s.type));
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SectionLabel>AI channel discovery</SectionLabel>
          <p className="mt-1 text-sm text-muted-foreground">
            Let Getrive suggest other communities worth listening to, based on your positioning.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isDiscovering}
          onClick={runDiscovery}
          className="shrink-0 gap-1.5 rounded-md"
        >
          {isDiscovering && <Loader2 className="size-3.5 animate-spin" />}
          {isDiscovering ? "Scanning…" : suggestions ? "Scan again" : "Scan for channels"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {suggestions && suggestions.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">No new suggestions right now.</p>
      )}
      {suggestions && suggestions.length > 0 && (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {suggestions.map((suggestion) => (
            <SuggestionCard
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
    </div>
  );
}

function SuggestionCard({
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
  const [dismissed, setDismissed] = useState(false);
  const isActive = suggestion.alreadyActive || added;
  if (dismissed) return null;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = suggestion.evidence
        ? await promoteVenueMiningSourceAction(projectId, {
            type: suggestion.type,
            name: suggestion.name,
            reasoning: suggestion.reasoning,
          })
        : await addDiscoveredSourceAction(projectId, {
            type: suggestion.type,
            name: suggestion.name,
            reasoning: suggestion.reasoning,
          });
      if (result.error) setError(result.error);
      else onAdded();
    });
  }

  function handleDismiss() {
    const sourceId = suggestion.sourceId;
    if (!sourceId) return;
    setError(null);
    startTransition(async () => {
      const result = await dismissVenueMiningCandidateAction(projectId, sourceId);
      if (result.error) setError(result.error);
      else setDismissed(true);
    });
  }

  return (
    <div className="flex w-64 shrink-0 snap-start flex-col gap-2 rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{formatSourceLabel(suggestion.type, suggestion.name)}</span>
        {suggestion.evidence && (
          <span className="shrink-0 text-[11px] text-accent">
            {suggestion.evidence.signalCount}/{suggestion.evidence.matchCount}
          </span>
        )}
      </div>
      <p className="line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">{suggestion.reasoning}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        {!isActive && suggestion.sourceId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleDismiss}
            className="flex-1 rounded-md"
          >
            Dismiss
          </Button>
        )}
        <Button
          type="button"
          variant={isActive ? "outline" : "secondary"}
          size="sm"
          disabled={isActive || isPending}
          onClick={handleAdd}
          className="flex-1 rounded-md"
        >
          {isActive ? "Added" : isPending ? "Adding…" : "Add"}
        </Button>
      </div>
    </div>
  );
}
