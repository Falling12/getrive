"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MeasurementProgressEvent, MeasurementSweepSummary } from "@/lib/services/measurement-run.service";

// How often to ping the cheap /status endpoint for "is another tab running
// a measurement right now" — a single-column read, not a data refresh.
const IDLE_STATUS_POLL_MS = 20_000;
const REMOTE_ACTIVE_STATUS_POLL_MS = 4_000;

export type MeasureStreamStatus =
  | { kind: "idle" }
  | { kind: "remote-active" }
  | { kind: "running"; line: string }
  | { kind: "done"; summary: MeasurementSweepSummary };

function lineFor(event: MeasurementProgressEvent): string {
  switch (event.type) {
    case "product-start":
      return `Measuring ${event.name} (${event.index}/${event.total})`;
    case "product-done":
      return `${event.name}: ${event.totalMatches} matches/90d — ${event.classification}`;
    case "product-error":
      return `${event.name}: measurement failed — ${event.message}`;
  }
}

// Client-side driver for the "Measure now" SSE stream (api/measure-stream)
// — structurally the same connect/parse/reconnect-safety shape as
// use-poll-stream.ts's usePollStream, just without the rate-limit status
// (this is allowlist-only, low volume, so a manual-poll-style rate limiter
// isn't needed here the way it is for the founder-facing poll button), and
// without a mid-run page refresh — the page only shows the final base
// rate, so there's nothing worth syncing until the sweep is done.
export function useMeasureStream(projectId: string, initialIsActive: boolean) {
  const router = useRouter();
  const [status, setStatus] = useState<MeasureStreamStatus>(
    initialIsActive ? { kind: "remote-active" } : { kind: "idle" }
  );
  const abortRef = useRef<AbortController | null>(null);
  const hasOwnStreamRef = useRef(false);
  const remoteActiveRef = useRef(initialIsActive);
  const isRunning = status.kind === "running" || status.kind === "remote-active";

  useEffect(() => {
    remoteActiveRef.current = initialIsActive;
    if (hasOwnStreamRef.current) return;
    setStatus(initialIsActive ? { kind: "remote-active" } : { kind: "idle" });
  }, [initialIsActive]);

  // Detects a run started elsewhere (another tab) by pinging a cheap
  // single-column status endpoint. Only refreshes the page when that
  // status flips from active to idle, since that's the one moment a
  // remote run may have produced a new base rate worth showing.
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (!hasOwnStreamRef.current && typeof document !== "undefined" && !document.hidden) {
        try {
          const response = await fetch(`/api/measure-stream/status?projectId=${projectId}`);
          if (!cancelled && response.ok && !hasOwnStreamRef.current) {
            const { isActive } = (await response.json()) as { isActive: boolean };
            const wasActive = remoteActiveRef.current;
            remoteActiveRef.current = isActive;
            if (isActive !== wasActive) {
              setStatus(isActive ? { kind: "remote-active" } : { kind: "idle" });
              if (wasActive && !isActive) router.refresh();
            }
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
  }, [projectId, router]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const start = useCallback(async () => {
    if (hasOwnStreamRef.current) return;
    hasOwnStreamRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "running", line: "Starting…" });

    try {
      const response = await fetch(`/api/measure-stream?projectId=${projectId}`, {
        signal: controller.signal,
      });
      if (response.status === 409) {
        hasOwnStreamRef.current = false;
        setStatus({ kind: "remote-active" });
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream body");
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLine = chunk.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const event = JSON.parse(dataLine.slice(6)) as
            | MeasurementProgressEvent
            | { type: "done"; summary: MeasurementSweepSummary };

          if (event.type === "done") {
            receivedDone = true;
            hasOwnStreamRef.current = false;
            setStatus({ kind: "done", summary: event.summary });
            router.refresh();
            continue;
          }

          setStatus({ kind: "running", line: lineFor(event) });
        }
      }

      // The connection can close without ever sending a "done" event — e.g.
      // the server function hit its own hard execution ceiling and got
      // killed mid-run, which skips its `finally` cleanup too. Without this,
      // hasOwnStreamRef stays true forever and every future "Measure now"
      // click silently no-ops (see the early return at the top of start()),
      // while status is stuck on the last "running" line.
      if (!receivedDone) {
        hasOwnStreamRef.current = false;
        setStatus({
          kind: "done",
          summary: { productsMeasured: 0, productsSkippedNoPositioning: 0, errors: 1 },
        });
        router.refresh();
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Measure stream failed", error);
        hasOwnStreamRef.current = false;
        setStatus({
          kind: "done",
          summary: { productsMeasured: 0, productsSkippedNoPositioning: 0, errors: 1 },
        });
      }
    }
  }, [projectId, router]);

  return { status, isRunning, start };
}
