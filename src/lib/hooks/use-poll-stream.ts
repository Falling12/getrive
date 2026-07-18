"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PollProgressEvent, PollSummary } from "@/lib/reddit/poll";

// How often to ping the cheap /status endpoint for "is some other tab (or
// the cron) running a poll right now" — not a data refresh, just a
// single-column read. Faster while we know one is running elsewhere, so
// its completion (and the router.refresh() that follows) is noticed
// promptly; slower otherwise since nothing is expected to change.
const IDLE_STATUS_POLL_MS = 20_000;
const REMOTE_ACTIVE_STATUS_POLL_MS = 4_000;

// Full-page router.refresh() is expensive (every Prisma query the page
// makes re-runs) and visually disruptive (the whole tree re-renders), so
// it's reserved for moments a refresh actually has something new to show:
// this tab's own stream finishing, a remote run finishing, or — while
// running — no more than once per this window, and only when a signal
// actually landed.
const REFRESH_THROTTLE_MS = 5_000;

export type PollStreamStatus =
  | { kind: "idle" }
  // Picked up from the server on mount/refresh — a poll is running (started
  // by this tab earlier, another tab, or before a page reload), but we have
  // no line-by-line detail for it, just the fact that it's active.
  | { kind: "remote-active" }
  | { kind: "running"; line: string; signalsSoFar: number; highlight: boolean }
  | { kind: "done"; summary: PollSummary }
  | { kind: "rate-limited"; message: string };

export function lineFor(event: PollProgressEvent): { line: string; isSignal: boolean } {
  switch (event.type) {
    case "source-start":
      return { line: `Checking ${event.name} (${event.index}/${event.total})`, isSignal: false };
    case "source-fetched":
      return { line: `Scoring ${event.postCount} new posts in ${event.name}`, isSignal: false };
    case "source-error":
      return { line: `Couldn't reach ${event.name} — skipping`, isSignal: false };
    case "post-scored":
      return {
        line: event.passed
          ? `Match found in ${event.sourceName}: ${Math.round(event.score * 100)}%`
          : `Scored a post in ${event.sourceName}: ${Math.round(event.score * 100)}%`,
        isSignal: false,
      };
    case "signal-created":
      return { line: `New signal in ${event.sourceName}`, isSignal: true };
    case "daily-cap-reached":
      return { line: `Daily scoring limit reached — resumes tomorrow`, isSignal: false };
    case "ingestion-failing":
      return {
        line: `${event.sourceName} has failed ${event.consecutiveFailures}x in a row`,
        isSignal: false,
      };
    case "ingestion-empty":
      return {
        line: `${event.sourceName} fetched OK but found 0 posts ${event.consecutiveEmptyPolls}x in a row`,
        isSignal: false,
      };
  }
}

// Shared client-side driver for the "Check for new posts" SSE stream —
// used by the manual PollNowButton (Signals page) and by the automatic
// first-scan trigger that fires right after onboarding (Dashboard page).
// Both need the exact same connect/parse/reconnect-safety behavior; only
// how (and whether) `start()` gets called, and how status renders, differs.
export function usePollStream(projectId: string, initialIsActive: boolean) {
  const router = useRouter();
  const [status, setStatus] = useState<PollStreamStatus>(
    initialIsActive ? { kind: "remote-active" } : { kind: "idle" }
  );
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  // Set once this tab starts its own stream, so a later server-render prop
  // update (from a background router.refresh()) doesn't clobber the
  // detailed live status with the generic "remote-active" one.
  const hasOwnStreamRef = useRef(false);
  // Baseline for the remote-status poll below — starts from what the
  // server already told us, so we don't mistake "still active from before
  // this mount" for a fresh transition and refresh needlessly.
  const remoteActiveRef = useRef(initialIsActive);
  // Durable activity marker (max Source.lastPolledAt) from the last status
  // check, so a poll that starts and finishes entirely between two ticks
  // still gets noticed — isActive flipping true-then-false is not
  // guaranteed to ever be observed, but this marker keeps moving forward
  // for the whole run regardless of polling cadence.
  const lastActivityRef = useRef<string | null>(null);
  const hasCheckedActivityRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const isRunning = status.kind === "running" || status.kind === "remote-active";

  const refreshThrottled = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_THROTTLE_MS) return;
    lastRefreshAtRef.current = now;
    router.refresh();
  }, [router]);

  const refreshNow = useCallback(() => {
    lastRefreshAtRef.current = Date.now();
    router.refresh();
  }, [router]);

  // Reflects the server's view of "is a poll active for this project" —
  // this is what survives a page refresh mid-poll, since local state alone
  // resets to nothing on reload.
  useEffect(() => {
    remoteActiveRef.current = initialIsActive;
    if (hasOwnStreamRef.current) return;
    setStatus(initialIsActive ? { kind: "remote-active" } : { kind: "idle" });
  }, [initialIsActive]);

  // Detects a poll started elsewhere (another tab, or the cron job) by
  // pinging a cheap status endpoint — never a full page refresh just to
  // check. Refreshes the page whenever the durable activity marker moves
  // forward (a run completed since we last checked, whether or not we ever
  // saw it as "active") or when isActive flips from true to false while we
  // were watching it live.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (!hasOwnStreamRef.current && typeof document !== "undefined" && !document.hidden) {
        try {
          const response = await fetch(`/api/poll-stream/status?projectId=${projectId}`);
          if (!cancelled && response.ok && !hasOwnStreamRef.current) {
            const { isActive, lastActivityAt } = (await response.json()) as {
              isActive: boolean;
              lastActivityAt: string | null;
            };
            const wasActive = remoteActiveRef.current;
            remoteActiveRef.current = isActive;
            if (isActive !== wasActive) {
              setStatus(isActive ? { kind: "remote-active" } : { kind: "idle" });
            }

            const activityMoved = hasCheckedActivityRef.current && lastActivityRef.current !== lastActivityAt;
            hasCheckedActivityRef.current = true;
            lastActivityRef.current = lastActivityAt;

            if (activityMoved || (wasActive && !isActive)) refreshNow();
          }
        } catch {
          // Network hiccup — just try again next tick.
        }
      }
      if (!cancelled) {
        timeoutId = setTimeout(poll, remoteActiveRef.current ? REMOTE_ACTIVE_STATUS_POLL_MS : IDLE_STATUS_POLL_MS);
      }
    }

    timeoutId = setTimeout(poll, remoteActiveRef.current ? REMOTE_ACTIVE_STATUS_POLL_MS : IDLE_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [projectId, refreshNow]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const start = useCallback(async () => {
    if (hasOwnStreamRef.current) return;
    hasOwnStreamRef.current = true;
    // The background status checker is paused while this stream owns the
    // status; re-baseline its activity marker (instead of leaving it
    // stale) so that when it resumes after this run it doesn't mistake
    // this run's own progress for a newly-detected one and double-refresh.
    hasCheckedActivityRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    let signalsSoFar = 0;
    setStatus({ kind: "running", line: "Starting…", signalsSoFar: 0, highlight: false });

    try {
      const response = await fetch(`/api/poll-stream?projectId=${projectId}`, {
        signal: controller.signal,
      });
      if (response.status === 409) {
        hasOwnStreamRef.current = false;
        setStatus({ kind: "remote-active" });
        return;
      }
      if (response.status === 429) {
        hasOwnStreamRef.current = false;
        setStatus({ kind: "rate-limited", message: await response.text() });
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream body");
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const event = JSON.parse(dataLine.slice(6)) as PollProgressEvent | { type: "done"; summary: PollSummary };

          if (event.type === "done") {
            hasOwnStreamRef.current = false;
            setStatus({ kind: "done", summary: event.summary });
            refreshNow();
            continue;
          }

          const { line, isSignal } = lineFor(event);
          if (isSignal) {
            signalsSoFar += 1;
            // A signal actually landed mid-run — worth surfacing without
            // waiting for the whole (up to ~2 minute) batch to finish, but
            // throttled so a burst of matches doesn't refresh the page
            // once per event.
            refreshThrottled();
          }
          setTick((t) => t + 1);
          setStatus({ kind: "running", line, signalsSoFar, highlight: isSignal });
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Poll stream failed", error);
        hasOwnStreamRef.current = false;
        setStatus({
          kind: "done",
          summary: { sourcesPolled: 0, postsFetched: 0, postsScored: 0, signalsCreated: 0, errors: 1 },
        });
      }
    }
  }, [projectId, refreshNow, refreshThrottled]);

  return { status, tick, isRunning, start };
}
