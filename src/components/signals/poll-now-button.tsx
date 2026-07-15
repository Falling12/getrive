"use client";

import { RefreshCw, Target, Radar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePollStream } from "@/lib/hooks/use-poll-stream";

export function PollNowButton({
  projectId,
  initialIsActive,
}: {
  projectId: string;
  initialIsActive: boolean;
}) {
  const { status, tick, isRunning, start } = usePollStream(projectId, initialIsActive);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isRunning}
        onClick={start}
        className={cn(
          "flex items-center gap-2 rounded border border-border bg-secondary/30 px-3 py-1.5 font-mono text-[13px] text-foreground transition-colors hover:bg-secondary/60",
          isRunning && "opacity-70"
        )}
      >
        <RefreshCw className={cn("size-3.5 text-accent", isRunning && "animate-spin")} />
        {isRunning ? "Checking…" : "Check for new posts"}
      </button>

      {status.kind === "remote-active" && (
        <div className="flex max-w-[220px] items-center gap-2 rounded-full border border-border bg-background/80 py-1.5 pr-3 pl-2.5">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <span className="absolute inline-flex size-4 animate-ping rounded-full bg-accent/40" />
            <span className="relative flex size-1.5 rounded-full bg-accent" />
          </span>
          <span className="font-mono text-[11px] leading-snug text-muted-foreground">
            Already checking — updates automatically
          </span>
        </div>
      )}

      {status.kind === "running" && (
        <div className="flex max-w-[260px] items-center gap-2 rounded-full border border-border bg-background/80 py-1.5 pr-3 pl-2.5">
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            <span className="absolute inline-flex size-4 animate-ping rounded-full bg-accent/40" />
            <span className="relative flex size-1.5 rounded-full bg-accent" />
          </span>
          <span
            key={tick}
            className={cn(
              "animate-[status-fade_0.25s_ease-out] truncate font-mono text-[11px]",
              status.highlight ? "text-accent" : "text-muted-foreground"
            )}
          >
            {status.line}
          </span>
        </div>
      )}

      {status.kind === "rate-limited" && (
        <div className="flex max-w-[260px] items-center gap-2 rounded-full border border-border bg-background/80 py-1.5 pr-3 pl-2.5">
          <Clock className="size-3 shrink-0 text-muted-foreground" />
          <span className="font-mono text-[11px] leading-snug text-muted-foreground">
            {status.message}
          </span>
        </div>
      )}

      {status.kind === "done" && (
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          {status.summary.signalsCreated > 0 ? (
            <Target className="size-3 text-accent" />
          ) : (
            <Radar className="size-3" />
          )}
          <span>
            {`Checked ${status.summary.sourcesPolled} source${status.summary.sourcesPolled === 1 ? "" : "s"} · ${status.summary.postsFetched} posts · ${status.summary.signalsCreated} new signal${status.summary.signalsCreated === 1 ? "" : "s"}${status.summary.errors ? ` · ${status.summary.errors} error${status.summary.errors === 1 ? "" : "s"}` : ""}`}
          </span>
        </div>
      )}
    </div>
  );
}
