"use client";

import type { ReactNode } from "react";
import { RefreshCw, Target, Radar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePollStream, type PollStreamStatus } from "@/lib/hooks/use-poll-stream";

function StatusIcon({ status }: { status: PollStreamStatus }) {
  if (status.kind === "rate-limited") {
    return <Clock className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  if (status.kind === "done") {
    return status.summary.signalsCreated > 0 ? (
      <Target className="size-3.5 shrink-0 text-accent" />
    ) : (
      <Radar className="size-3.5 shrink-0 text-muted-foreground" />
    );
  }
  // "running" or "remote-active" — a scan is in flight.
  return (
    <span className="relative flex size-3.5 shrink-0 items-center justify-center">
      <span className="absolute inline-flex size-3.5 animate-ping rounded-full bg-accent/40" />
      <span className="relative flex size-1.5 rounded-full bg-accent" />
    </span>
  );
}

function statusLine(status: PollStreamStatus): string {
  switch (status.kind) {
    case "idle":
      return "";
    case "remote-active":
      return "Already checking — updates automatically";
    case "running":
      return status.line;
    case "rate-limited":
      return status.message;
    case "done":
      return `Checked ${status.summary.sourcesPolled} source${status.summary.sourcesPolled === 1 ? "" : "s"} · ${status.summary.postsFetched} posts · ${status.summary.signalsCreated} new signal${status.summary.signalsCreated === 1 ? "" : "s"}${status.summary.errors ? ` · ${status.summary.errors} error${status.summary.errors === 1 ? "" : "s"}` : ""}`;
  }
}

// `children` carries the page-level title/dot so this component can lay it
// out on the same row as the trigger button while the live status gets its
// own full-width line beneath both — returning a fragment (not a wrapping
// div) so the parent's flex-col stacks the two rows directly.
export function PollNowButton({
  projectId,
  initialIsActive,
  children,
}: {
  projectId: string;
  initialIsActive: boolean;
  children?: ReactNode;
}) {
  const { status, tick, isRunning, start } = usePollStream(projectId, initialIsActive);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        {children}
        <button
          type="button"
          disabled={isRunning}
          onClick={start}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded border border-border bg-secondary/30 px-3 py-1.5 font-mono text-[13px] text-foreground transition-colors hover:bg-secondary/60",
            isRunning && "opacity-70"
          )}
        >
          <RefreshCw className={cn("size-3.5 text-accent", isRunning && "animate-spin")} />
          {isRunning ? "Checking…" : "Check for new posts"}
        </button>
      </div>

      {status.kind !== "idle" && (
        <div
          aria-live="polite"
          className="flex w-full items-center gap-2.5 rounded-md bg-background/60 px-3.5 py-2.5"
        >
          <StatusIcon status={status} />
          <span
            key={status.kind === "running" ? tick : status.kind}
            className={cn(
              "min-w-0 flex-1 animate-[status-fade_0.25s_ease-out] font-mono text-[11px] leading-snug",
              status.kind === "running" && status.highlight ? "text-accent" : "text-muted-foreground"
            )}
          >
            {statusLine(status)}
          </span>
        </div>
      )}
    </>
  );
}
