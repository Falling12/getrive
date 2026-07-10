"use client";

import { useEffect, useRef, useState } from "react";

// Loops through a short sequence of lines, terminal-style, once the tile
// scrolls into view — describes what generateReply (lib/ai/reply-generation.ts)
// actually reads before drafting, not a fabricated feature list.
const TERMINAL_LINES = [
  "Loading your product description + positioning...",
  "Reading the post's exact wording, not a keyword match",
  "Matching tone to this specific community",
  "Drafting — one honest mention, low-key, near the end",
];

const LINE_APPEAR_DELAY_MS = 300;
const LINE_HOLD_MS = 800;
const LAST_LINE_HOLD_MS = 2500;
const LOOP_RESET_MS = 300;

export function TerminalLoop() {
  const ref = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          if (reduceMotion) setVisibleCount(TERMINAL_LINES.length);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => {
      timeouts.push(setTimeout(() => !cancelled && fn(), ms));
    };

    let elapsed = 0;
    TERMINAL_LINES.forEach((_, index) => {
      elapsed += LINE_APPEAR_DELAY_MS;
      after(elapsed, () => setVisibleCount(index + 1));
      elapsed += index === TERMINAL_LINES.length - 1 ? LAST_LINE_HOLD_MS : LINE_HOLD_MS;
    });
    after(elapsed + LOOP_RESET_MS, () => {
      setVisibleCount(0);
      setCycleKey((k) => k + 1);
    });

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [started, cycleKey]);

  return (
    <div ref={ref} className="flex min-h-[120px] flex-col gap-2">
      {TERMINAL_LINES.slice(0, visibleCount).map((line, index) => (
        <div key={`${cycleKey}-${index}`} className="animate-[auth-fade-in_0.3s_ease-out_forwards]">
          <span className="text-[var(--accent-glow)]">sys:~$</span> {line}
        </div>
      ))}
    </div>
  );
}
