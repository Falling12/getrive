"use client";

import { useState, useTransition } from "react";
import { Plus, Check, X, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addManualQueryAction,
  setQueryActiveAction,
  approveProposedQueryAction,
  dismissProposedQueryAction,
  deleteQueryAction,
} from "@/app/(app)/projects/[projectId]/search/actions";
import type { SearchPlatform, QueryVariantType } from "@/generated/prisma/client";

export interface QueryRowData {
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

const PLATFORM_OPTIONS: SearchPlatform[] = ["REDDIT", "STACKEXCHANGE", "HACKERNEWS"];
const VARIANT_OPTIONS: QueryVariantType[] = ["LITERAL", "COLLOQUIAL", "PLATFORM_IDIOMATIC"];

function StatRow({ query }: { query: QueryRowData }) {
  return (
    <span className="font-mono text-[10px] text-muted-foreground">
      {query.matchCount} match{query.matchCount === 1 ? "" : "es"} · {query.passCount} passed
      {query.avgMatchScore != null ? ` · avg ${query.avgMatchScore.toFixed(2)}` : ""}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: SearchPlatform }) {
  return (
    <span className="rounded-sm border border-border bg-secondary/20 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
      {platform}
    </span>
  );
}

function VariantBadge({ variantType }: { variantType: QueryVariantType }) {
  return (
    <span className="rounded-sm border border-border bg-secondary/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-muted-foreground/80 uppercase">
      {variantType.replace("_", " ")}
    </span>
  );
}

export function QueryManagementPanel({
  projectId,
  active,
  proposed,
  retired,
}: {
  projectId: string;
  active: QueryRowData[];
  proposed: QueryRowData[];
  retired: QueryRowData[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <AddQueryForm projectId={projectId} />

      {proposed.length > 0 && (
        <div>
          <h3 className="font-mono text-[11px] tracking-wider text-accent uppercase">
            Proposed ({proposed.length}) — mined from real passing signals
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border/60">
              {proposed.map((q) => (
                <ProposedRow key={q.id} projectId={projectId} query={q} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
          Active ({active.length})
        </h3>
        {active.length === 0 ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">No active queries yet.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border/60">
              {active.map((q) => (
                <ActiveRow key={q.id} projectId={projectId} query={q} />
              ))}
            </div>
          </div>
        )}
      </div>

      {retired.length > 0 && (
        <div>
          <h3 className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
            Retired ({retired.length})
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border/60">
              {retired.map((q) => (
                <RetiredRow key={q.id} projectId={projectId} query={q} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddQueryForm({ projectId }: { projectId: string }) {
  const [platform, setPlatform] = useState<SearchPlatform>("REDDIT");
  const [variantType, setVariantType] = useState<QueryVariantType>("COLLOQUIAL");
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addManualQueryAction(projectId, { platform, text, variantType });
      if (result.error) setError(result.error);
      else setText("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <h3 className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">Add a query</h3>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as SearchPlatform)}
          className="rounded-md border border-border bg-secondary/10 px-2 py-2 font-mono text-xs text-foreground outline-none focus:border-accent"
        >
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={variantType}
          onChange={(e) => setVariantType(e.target.value as QueryVariantType)}
          className="rounded-md border border-border bg-secondary/10 px-2 py-2 font-mono text-xs text-foreground outline-none focus:border-accent"
        >
          {VARIANT_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="3-6 keywords, e.g. finding first users reddit"
          className="min-w-0 flex-1 rounded-md border border-border bg-secondary/10 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-accent"
        />
        <Button
          type="submit"
          disabled={isPending || !text.trim()}
          className="shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

function ActiveRow({ projectId, query }: { projectId: string; query: QueryRowData }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={query.platform} />
          <VariantBadge variantType={query.variantType} />
        </div>
        <p className="mt-1 truncate text-sm text-foreground">{query.text}</p>
        <StatRow query={query} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await setQueryActiveAction(projectId, query.id, false);
            if (result.error) setError(result.error);
          })
        }
        className="w-fit shrink-0 rounded-md font-mono text-[11px] tracking-wider uppercase"
      >
        <Power className="size-3.5" />
        Deactivate
      </Button>
    </div>
  );
}

function ProposedRow({ projectId, query }: { projectId: string; query: QueryRowData }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  if (resolved) return null;

  return (
    <div className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={query.platform} />
          <VariantBadge variantType={query.variantType} />
        </div>
        <p className="mt-1 truncate text-sm text-foreground">{query.text}</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await dismissProposedQueryAction(projectId, query.id);
              if (result.error) setError(result.error);
              else setResolved(true);
            })
          }
          className="rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <X className="size-3.5" />
          Dismiss
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await approveProposedQueryAction(projectId, query.id);
              if (result.error) setError(result.error);
              else setResolved(true);
            })
          }
          className="rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <Check className="size-3.5" />
          Approve
        </Button>
      </div>
    </div>
  );
}

function RetiredRow({ projectId, query }: { projectId: string; query: QueryRowData }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  return (
    <div className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={query.platform} />
          <VariantBadge variantType={query.variantType} />
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground/80">{query.text}</p>
        {query.retiredReason && (
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">{query.retiredReason}</p>
        )}
        <StatRow query={query} />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteQueryAction(projectId, query.id);
              if (result.error) setError(result.error);
              else setDeleted(true);
            })
          }
          className="w-fit rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await setQueryActiveAction(projectId, query.id, true);
              if (result.error) setError(result.error);
            })
          }
          className="w-fit rounded-md font-mono text-[11px] tracking-wider uppercase"
        >
          <Power className="size-3.5" />
          Reactivate
        </Button>
      </div>
    </div>
  );
}
