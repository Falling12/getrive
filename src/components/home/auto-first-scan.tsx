"use client";

import { useEffect, useRef, useState } from "react";
import { Radar, Target, Clock } from "lucide-react";
import { usePollStream, type PollStreamStatus } from "@/lib/hooks/use-poll-stream";

// Auto-triggers the first "check for new posts" run right after onboarding.
// Used to gate on a one-shot `?firstscan=1` query param appended to
// onboarding's dashboard redirect, but that param survived only as long as
// the exact client navigation that carried it — a refresh before the
// effect ran, a second tab, or the param simply getting lost could leave a
// founder on a permanently blank Home page with no way to retry. Trigger is
// now `needsFirstScan` (see home/page.tsx): durable, DB-derived, and
// self-clearing — it's true exactly until this project's first post is
// scored, then never again.
export function AutoFirstScan({
  projectId,
  initialIsActive,
  needsFirstScan,
}: {
  projectId: string;
  initialIsActive: boolean;
  needsFirstScan: boolean;
}) {
  const { status, tick, start } = usePollStream(projectId, initialIsActive);
  // Captured once at mount, not tracked live: needsFirstScan flips false
  // the moment this very scan's first post gets scored, and the `done`
  // handler below triggers a router.refresh() that feeds a fresh (now
  // false) value back in as a prop — without freezing the ORIGINAL value,
  // that refresh would rip the results banner away before a founder could
  // read it. It also means a founder who was already past their first scan
  // when this mounted can never start treating a later, unrelated poll as
  // if it were one.
  const wasFirstScan = useRef(needsFirstScan).current;

  useEffect(() => {
    if (!wasFirstScan || initialIsActive) return;
    // usePollStream's start() is itself a no-op once a stream is already
    // owned by this tab, so there's no need to separately track "did we
    // already call this" here.
    start();
  }, [wasFirstScan, initialIsActive, start]);

  // Freezes the displayed status the first time it reaches a resting state.
  // Without this, usePollStream's own cross-tab "is a poll active for this
  // project" detection keeps listening indefinitely — so ANY later poll for
  // this project (cron, another tab, or the founder's own "Check for new
  // posts" button, long after the real first scan finished) flips this
  // component's status from idle to remote-active again, incorrectly
  // reopening the "scanning for your first signals" banner for a run that
  // has nothing to do with the founder's actual first scan.
  const [frozen, setFrozen] = useState<PollStreamStatus | null>(null);
  useEffect(() => {
    if (!wasFirstScan || frozen) return;
    if (status.kind === "done" || status.kind === "rate-limited") {
      setFrozen(status);
    }
  }, [wasFirstScan, frozen, status]);

  if (!wasFirstScan) return null;

  const display = frozen ?? status;
  if (display.kind === "idle") return null;
  const displayIsRunning = display.kind === "running" || display.kind === "remote-active";

  return (
    <div
      data-tour="first-scan"
      className="mb-10 flex w-full items-start gap-4 rounded-xl border border-accent/30 bg-accent/5 p-5 md:p-6"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
        {display.kind === "done" ? (
          display.summary.signalsCreated > 0 ? (
            <Target className="size-5" />
          ) : (
            <Radar className="size-5" />
          )
        ) : display.kind === "rate-limited" ? (
          <Clock className="size-5" />
        ) : (
          <Radar className="size-5 animate-pulse" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {displayIsRunning && (
          <>
            <p className="text-sm font-medium text-foreground">
              Scanning your sources for the first signals…
            </p>
            <p key={tick} className="animate-[status-fade_0.25s_ease-out] font-mono text-[11px] text-muted-foreground">
              {display.kind === "running" ? display.line : "Connecting…"}
              {display.kind === "running" && display.signalsSoFar > 0 && (
                <span className="ml-2 text-accent">
                  {display.signalsSoFar} signal{display.signalsSoFar === 1 ? "" : "s"} found so far
                </span>
              )}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/70">
              This first check can take a couple of minutes — Reddit rate-limits how fast we can
              read. It keeps running even if you leave this page.
            </p>
          </>
        )}

        {display.kind === "rate-limited" && (
          <>
            <p className="text-sm font-medium text-foreground">First scan will run shortly</p>
            <p className="font-mono text-[11px] text-muted-foreground">{display.message}</p>
          </>
        )}

        {display.kind === "done" && (
          <>
            <p className="text-sm font-medium text-foreground">
              {display.summary.signalsCreated > 0
                ? `Found ${display.summary.signalsCreated} signal${display.summary.signalsCreated === 1 ? "" : "s"} already.`
                : "First scan complete — nothing matched yet."}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {`Checked ${display.summary.sourcesPolled} source${display.summary.sourcesPolled === 1 ? "" : "s"} · ${display.summary.postsFetched} posts scored${display.summary.errors ? ` · ${display.summary.errors} error${display.summary.errors === 1 ? "" : "s"}` : ""}. Getrive keeps checking automatically from here.`}
            </p>
            {(display.summary.signalsCreated > 0 || display.summary.postsFetched > 0) && (
              // The feed now lives on this same page, right below — an
              // in-page anchor instead of a navigation.
              <a
                href="#signal-feed"
                className="mt-2 w-fit rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[11px] tracking-wider text-accent uppercase transition-colors hover:bg-accent/20"
              >
                {display.summary.signalsCreated > 0 ? "View signals" : "See what was scored"}
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
