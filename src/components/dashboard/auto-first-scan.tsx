"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Radar, Target, Clock } from "lucide-react";
import { usePollStream } from "@/lib/hooks/use-poll-stream";

// Fires automatically right after onboarding — see the `firstscan=1` param
// onboarding's confirmSourcesAction appends to its dashboard redirect.
// Distinct from `tour=1` (also on that URL, consumed separately by
// ProductTour) because Settings' "Retake tour" link reuses `tour=1` on its
// own and must never re-trigger a live poll.
export function AutoFirstScan({
  projectId,
  initialIsActive,
}: {
  projectId: string;
  initialIsActive: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, tick, isRunning, start } = usePollStream(projectId, initialIsActive);

  useEffect(() => {
    if (searchParams.get("firstscan") !== "1") return;
    // Strip immediately — a refresh or back-navigation must not replay this.
    router.replace(pathname, { scroll: false });
    // usePollStream's start() is itself a no-op once a stream is already
    // owned by this tab, so there's no need to separately track "did we
    // already call this" here.
    if (!initialIsActive) start();
  }, [searchParams, pathname, router, initialIsActive, start]);

  // Nothing to show until this tab has actually kicked off (or picked up)
  // the first scan — most page loads never render this at all. status
  // flips off "idle" synchronously inside start(), so this never misses
  // the transition.
  if (status.kind === "idle") return null;

  return (
    <div
      data-tour="first-scan"
      className="mb-10 flex w-full items-start gap-4 rounded-xl border border-accent/30 bg-accent/5 p-5 md:p-6"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
        {status.kind === "done" ? (
          status.summary.signalsCreated > 0 ? (
            <Target className="size-5" />
          ) : (
            <Radar className="size-5" />
          )
        ) : status.kind === "rate-limited" ? (
          <Clock className="size-5" />
        ) : (
          <Radar className="size-5 animate-pulse" />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {(isRunning || status.kind === "running") && (
          <>
            <p className="text-sm font-medium text-foreground">
              Scanning your sources for the first signals…
            </p>
            <p key={tick} className="animate-[status-fade_0.25s_ease-out] font-mono text-[11px] text-muted-foreground">
              {status.kind === "running" ? status.line : "Connecting…"}
              {status.kind === "running" && status.signalsSoFar > 0 && (
                <span className="ml-2 text-accent">
                  {status.signalsSoFar} signal{status.signalsSoFar === 1 ? "" : "s"} found so far
                </span>
              )}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground/70">
              This first check can take a couple of minutes — Reddit rate-limits how fast we can
              read. It keeps running even if you leave this page.
            </p>
          </>
        )}

        {status.kind === "rate-limited" && (
          <>
            <p className="text-sm font-medium text-foreground">First scan will run shortly</p>
            <p className="font-mono text-[11px] text-muted-foreground">{status.message}</p>
          </>
        )}

        {status.kind === "done" && (
          <>
            <p className="text-sm font-medium text-foreground">
              {status.summary.signalsCreated > 0
                ? `Found ${status.summary.signalsCreated} signal${status.summary.signalsCreated === 1 ? "" : "s"} already.`
                : "First scan complete — nothing matched yet."}
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {`Checked ${status.summary.sourcesPolled} source${status.summary.sourcesPolled === 1 ? "" : "s"} · ${status.summary.postsFetched} posts scored${status.summary.errors ? ` · ${status.summary.errors} error${status.summary.errors === 1 ? "" : "s"}` : ""}. Getrive keeps checking automatically from here.`}
            </p>
            {status.summary.signalsCreated > 0 && (
              <Link
                href={`/projects/${projectId}/signals`}
                className="mt-2 w-fit rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[11px] tracking-wider text-accent uppercase transition-colors hover:bg-accent/20"
              >
                View signals
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
