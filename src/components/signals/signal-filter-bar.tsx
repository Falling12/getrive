import Link from "next/link";
import { Filter, Plus, Hash, RadioTower, AtSign } from "lucide-react";
import type { SourceType } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "not-replied", label: "Not replied" },
  { value: "replied", label: "Replied" },
  { value: "dismissed", label: "Dismissed" },
] as const;

// Same icon-per-channel vocabulary as the Sources page and onboarding's
// channel plan — a source pill here should read as "the same instrument,"
// not reintroduce its own iconography.
const CHANNEL_ICON: Record<SourceType, typeof Hash> = {
  REDDIT_SUBREDDIT: Hash,
  HACKERNEWS: RadioTower,
  TWITTER_SEARCH: AtSign,
};

export function SignalFilterBar({
  projectId,
  sources,
  activeSource,
  activeStatus,
}: {
  projectId: string;
  sources: { name: string; type: SourceType; label: string; count: number }[];
  activeSource?: string;
  activeStatus: string;
}) {
  const basePath = `/projects/${projectId}/signals`;

  function hrefFor(overrides: { source?: string | null; status?: string }) {
    const params = new URLSearchParams();
    const source = overrides.source !== undefined ? overrides.source : activeSource;
    const status = overrides.status !== undefined ? overrides.status : activeStatus;
    if (source) params.set("source", source);
    if (status && status !== "all") params.set("status", status);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  function pillClass(active: boolean) {
    return cn(
      "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] whitespace-nowrap transition-colors",
      active
        ? "border-accent bg-accent/10 text-accent"
        : "border-border bg-background text-muted-foreground hover:bg-secondary/30"
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 p-5 md:px-6">
      <div className="flex w-full flex-col justify-between gap-4 border-b border-border/30 pb-4 sm:flex-row sm:items-center">
        <div className="inline-flex w-full min-w-0 shrink-0 self-start overflow-x-auto rounded-md border border-border bg-background p-1 sm:w-auto">
          {STATUS_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={hrefFor({ status: option.value })}
              className={cn(
                "rounded px-4 py-1.5 font-mono text-[11px] tracking-wider whitespace-nowrap uppercase transition-colors",
                activeStatus === option.value
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 px-1 font-mono text-[10px] tracking-widest text-muted-foreground/70 uppercase">
          <Filter className="size-3.5" />
          <span>
            Signal sources ({sources.length} active)
          </span>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2.5">
        <Link href={hrefFor({ source: null })} className={pillClass(!activeSource)}>
          All sources
        </Link>
        {sources.map((source) => {
          const Icon = CHANNEL_ICON[source.type];
          return (
            <Link
              key={source.name}
              href={hrefFor({ source: source.name })}
              className={cn(pillClass(activeSource === source.name), source.count === 0 && "opacity-60")}
            >
              <Icon className="size-3" />
              {source.label} ({source.count})
            </Link>
          );
        })}
        <Link
          href={`/projects/${projectId}/sources`}
          className="ml-1 flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border/50 px-3 py-1 font-mono text-[10px] whitespace-nowrap text-muted-foreground/50 transition-colors hover:border-muted-foreground/50 hover:text-foreground"
        >
          <Plus className="size-3" /> Add source
        </Link>
      </div>
    </div>
  );
}
