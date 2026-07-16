"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PollProgressEvent, PollSummary } from "@/lib/reddit/poll";

// Idle: still picks up whatever the automatic 5-minute cron creates.
// Active: ticks much faster so signals created mid-poll actually appear as
// they land, instead of only once the full ~2 minute batch finishes.
const IDLE_REFRESH_MS = 20_000;
const ACTIVE_REFRESH_MS = 4_000;

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
  // update (from the periodic router.refresh() below) doesn't clobber the
  // detailed live status with the generic "remote-active" one.
  const hasOwnStreamRef = useRef(false);
  const isRunning = status.kind === "running" || status.kind === "remote-active";

  // Reflects the server's view of "is a poll active for this project" —
  // this is what survives a page refresh mid-poll, since local state alone
  // resets to nothing on reload.
  useEffect(() => {
    if (hasOwnStreamRef.current) return;
    setStatus(initialIsActive ? { kind: "remote-active" } : { kind: "idle" });
  }, [initialIsActive]);

  useEffect(() => {
    const id = setInterval(
      () => router.refresh(),
      isRunning ? ACTIVE_REFRESH_MS : IDLE_REFRESH_MS
    );
    return () => clearInterval(id);
  }, [router, isRunning]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const start = useCallback(async () => {
    if (hasOwnStreamRef.current) return;
    hasOwnStreamRef.current = true;
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
            router.refresh();
            continue;
          }

          const { line, isSignal } = lineFor(event);
          if (isSignal) signalsSoFar += 1;
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
  }, [projectId, router]);

  return { status, tick, isRunning, start };
}
