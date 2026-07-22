"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, Check, Power, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import { useMeasureStream } from "@/lib/hooks/use-measure-stream";
import { CONSECUTIVE_FAILURE_ALERT_THRESHOLD } from "@/lib/limits";
import {
  addManualQueryAction,
  setQueryActiveAction,
  approveProposedQueryAction,
  dismissProposedQueryAction,
  deleteQueryAction,
} from "@/app/(app)/projects/[projectId]/search/actions";
import type { SearchPlatform, QueryVariantType } from "@/generated/prisma/client";
import { SectionLabel } from "@/components/targeting/v2/kit";

export interface TargetingQueryRow {
  id: string;
  platform: SearchPlatform;
  text: string;
  variantType: QueryVariantType;
  matchCount: number;
  passCount: number;
  avgMatchScore: number | null;
  retiredReason: string | null;
  consecutiveFailures: number;
  lastSuccessfulRunAt: Date | null;
}

export interface TargetingSearchData {
  hasPositioning: boolean;
  baseRateClass: string | null;
  baseRateMatchCount: number | null;
  baseRateMeasuredAt: Date | null;
  monthlyRate: number | null;
  lastIngestionAt: Date | null;
  lastIngestionMatched: number | null;
  lastIngestionScored: number | null;
  lastIngestionSignals: number | null;
  lastIngestionErrors: number | null;
  isMeasuring: boolean;
  active: TargetingQueryRow[];
  proposed: TargetingQueryRow[];
  retired: TargetingQueryRow[];
}

const inputClass =
  "min-w-0 rounded-md bg-secondary/15 px-3 py-2 text-sm text-foreground outline-none ring-1 ring-transparent transition-shadow focus:ring-accent";

const PLATFORM_LABELS: Record<SearchPlatform, string> = {
  REDDIT: "Reddit",
  STACKEXCHANGE: "Stack Exchange",
  HACKERNEWS: "Hacker News",
};

// Plain-language stand-ins for the DB enum — "how the phrase is worded",
// not internal taxonomy a founder has any reason to already know.
const VARIANT_LABELS: Record<QueryVariantType, string> = {
  LITERAL: "Exact wording",
  COLLOQUIAL: "Casual phrasing",
  PLATFORM_IDIOMATIC: "Platform slang",
};

export function SearchTargetingPanel({ projectId, data }: { projectId: string; data: TargetingSearchData }) {
  if (!data.hasPositioning) {
    return (
      <p className="text-sm text-muted-foreground">
        Set your Positioning first — measurement uses it to generate search queries.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Readout
          label="How often people ask for this"
          value={data.monthlyRate != null ? `~${data.monthlyRate}/mo` : "—"}
          detail={
            data.baseRateClass
              ? `${data.baseRateClass.toLowerCase()} demand — ${data.baseRateMatchCount} matching posts in the last 90 days${data.baseRateMeasuredAt ? `, measured ${formatRelativeTime(data.baseRateMeasuredAt)}` : ""}.`
              : "Not measured yet — this estimates how common this pain point already is across everywhere you're listening."
          }
          tone={data.baseRateClass === "HIGH" ? "good" : "neutral"}
        >
          <MeasureNow projectId={projectId} initialIsActive={data.isMeasuring} />
        </Readout>
        <Readout
          label="Signals found so far"
          value={data.lastIngestionSignals != null ? String(data.lastIngestionSignals) : "—"}
          detail={
            data.lastIngestionAt
              ? `Getrive fetched ${data.lastIngestionMatched ?? 0} matching posts and scored ${data.lastIngestionScored ?? 0} for relevance — ${data.lastIngestionSignals ?? 0} were worth replying to. Ran ${formatRelativeTime(data.lastIngestionAt)}.${data.lastIngestionErrors ? ` ${data.lastIngestionErrors} errors.` : ""}`
              : "Runs automatically whenever Getrive checks for new posts — this fetches matching posts and scores each one for relevance."
          }
          tone={data.lastIngestionErrors ? "attention" : "neutral"}
        />
      </div>

      <div className="flex flex-col gap-5 rounded-2xl bg-secondary/10 p-5">
        <div className="flex flex-col gap-3">
          <SectionLabel>Search phrases</SectionLabel>
          <p className="text-sm text-muted-foreground">
            Getrive writes these automatically from your positioning — you don&apos;t need to write your
            own. Turn off ones that aren&apos;t working, or approve the ones it&apos;s proposing below.
          </p>
          <AddQuery projectId={projectId} />
        </div>

        {data.proposed.length > 0 && (
          <QueryTable title={`Proposed (${data.proposed.length})`} rows={data.proposed} projectId={projectId} kind="proposed" />
        )}
        <QueryTable
          title={`Active (${data.active.length})`}
          rows={data.active}
          projectId={projectId}
          kind="active"
          emptyLabel="No active queries yet."
        />
        {data.retired.length > 0 && (
          <QueryTable title={`Retired (${data.retired.length})`} rows={data.retired} projectId={projectId} kind="retired" />
        )}
      </div>
    </div>
  );
}

function Readout({
  label,
  value,
  detail,
  tone,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "attention" | "neutral";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-secondary/10 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">{label}</span>
        <span
          className={cn(
            "font-mono text-lg tabular-nums",
            tone === "attention" ? "text-destructive" : tone === "good" ? "text-accent" : "text-foreground"
          )}
        >
          {value}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

function MeasureNow({ projectId, initialIsActive }: { projectId: string; initialIsActive: boolean }) {
  const { status, isRunning, start } = useMeasureStream(projectId, initialIsActive);
  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" size="sm" disabled={isRunning} onClick={start} className="w-full rounded-md">
        {isRunning ? "Measuring…" : "Measure now"}
      </Button>
      {status.kind === "running" && <span className="truncate text-[11px] text-muted-foreground">{status.line}</span>}
    </div>
  );
}

function AddQuery({ projectId }: { projectId: string }) {
  const [platform, setPlatform] = useState<SearchPlatform>("REDDIT");
  const [variantType, setVariantType] = useState<QueryVariantType>("COLLOQUIAL");
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addManualQueryAction(projectId, { platform, text, variantType });
      if (result.error) setError(result.error);
      else setText("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as SearchPlatform)}
          className={cn(inputClass, "w-auto")}
        >
          {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={variantType}
          onChange={(e) => setVariantType(e.target.value as QueryVariantType)}
          className={cn(inputClass, "w-auto")}
        >
          {Object.entries(VARIANT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="3-6 keywords, e.g. finding first users reddit"
          className={cn(inputClass, "flex-1")}
        />
        <Button type="submit" size="sm" disabled={isPending || !text.trim()} className="shrink-0 rounded-md">
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground/70">
        Exact wording = your literal phrase · Casual phrasing = how people actually talk · Platform
        slang = worded the way this platform&apos;s community talks.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

function QueryTable({
  title,
  rows,
  projectId,
  kind,
  emptyLabel,
}: {
  title: string;
  rows: TargetingQueryRow[];
  projectId: string;
  kind: "active" | "proposed" | "retired";
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <SectionLabel>{title}</SectionLabel>
        {emptyLabel && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>{title}</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground uppercase">
              <th className="py-2 pr-3 font-normal">Query</th>
              <th className="py-2 pr-3 text-right font-normal">Matches</th>
              <th className="py-2 pr-3 text-right font-normal">Passed</th>
              <th className="py-2 pr-3 text-right font-normal">Avg</th>
              <th className="py-2 pl-3 text-right font-normal">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((query) => (
              <QueryTableRow key={query.id} projectId={projectId} query={query} kind={kind} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QueryTableRow({
  projectId,
  query,
  kind,
}: {
  projectId: string;
  query: TargetingQueryRow;
  kind: "active" | "proposed" | "retired";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  if (resolved) return null;
  const isFailing = query.consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD;

  function run(action: () => Promise<{ error?: string; success?: boolean }>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else onSuccess?.();
    });
  }

  return (
    <tr className={cn("border-b border-border/30", kind === "retired" && "text-muted-foreground/70")}>
      <td className="py-2 pr-3">
        <span className="line-clamp-1">{query.text}</span>
        <p className="text-[11px] text-muted-foreground/60">
          {PLATFORM_LABELS[query.platform]} · {VARIANT_LABELS[query.variantType]}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {kind === "retired" && query.retiredReason && (
          <p className="text-[11px] text-muted-foreground/50">{query.retiredReason}</p>
        )}
        {isFailing && (
          <p className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertTriangle className="size-3 shrink-0" />
            {query.consecutiveFailures} failed runs in a row
          </p>
        )}
      </td>
      <td className="py-2 pr-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{query.matchCount}</td>
      <td className="py-2 pr-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{query.passCount}</td>
      <td className="py-2 pr-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
        {query.avgMatchScore != null ? query.avgMatchScore.toFixed(2) : "—"}
      </td>
      <td className="py-2 pl-3">
        <div className="flex justify-end gap-1">
          {kind === "active" && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={() => run(() => setQueryActiveAction(projectId, query.id, false))}
              aria-label="Deactivate"
            >
              <Power className="size-3.5" />
            </Button>
          )}
          {kind === "proposed" && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => run(() => dismissProposedQueryAction(projectId, query.id), () => setResolved(true))}
                aria-label="Dismiss"
              >
                <X className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => run(() => approveProposedQueryAction(projectId, query.id), () => setResolved(true))}
                aria-label="Approve"
                className="text-accent"
              >
                <Check className="size-3.5" />
              </Button>
            </>
          )}
          {kind === "retired" && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => run(() => deleteQueryAction(projectId, query.id), () => setResolved(true))}
                aria-label="Delete"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => run(() => setQueryActiveAction(projectId, query.id, true))}
                aria-label="Reactivate"
              >
                <Power className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

