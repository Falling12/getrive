"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MeasurementProgressEvent, MeasurementSweepSummary } from "@/lib/services/measurement-run.service";

const IDLE_REFRESH_MS = 20_000;
const ACTIVE_REFRESH_MS = 4_000;

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
// isn't needed here the way it is for the founder-facing poll button).
export function useMeasureStream(projectId: string, initialIsActive: boolean) {
  const router = useRouter();
  const [status, setStatus] = useState<MeasureStreamStatus>(
    initialIsActive ? { kind: "remote-active" } : { kind: "idle" }
  );
  const abortRef = useRef<AbortController | null>(null);
  const hasOwnStreamRef = useRef(false);
  const isRunning = status.kind === "running" || status.kind === "remote-active";

  useEffect(() => {
    if (hasOwnStreamRef.current) return;
    setStatus(initialIsActive ? { kind: "remote-active" } : { kind: "idle" });
  }, [initialIsActive]);

  useEffect(() => {
    const id = setInterval(() => router.refresh(), isRunning ? ACTIVE_REFRESH_MS : IDLE_REFRESH_MS);
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
