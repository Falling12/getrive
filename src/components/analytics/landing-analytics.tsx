"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/posthog-client";

const SCROLL_THRESHOLDS = [25, 50, 75, 100];

// Landing-page-only instrumentation beyond autocapture/heatmaps: explicit
// scroll depth checkpoints and time-on-page, since neither is a named event
// PostHog emits on its own. Mount once, at the top of LandingPage.
export function LandingAnalytics() {
  const firedThresholds = useRef(new Set<number>());
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = Date.now();
    track("homepage_viewed");

    function scrollPercent() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return 100;
      return Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    }

    function onScroll() {
      const percent = scrollPercent();
      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold && !firedThresholds.current.has(threshold)) {
          firedThresholds.current.add(threshold);
          track("scroll_depth_reached", { percent: threshold });
        }
      }
    }

    function sendTimeOnPage() {
      const seconds = Math.round((Date.now() - mountedAt.current) / 1000);
      track("landing_time_on_page", { seconds });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) sendTimeOnPage();
    });
    window.addEventListener("pagehide", sendTimeOnPage);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", sendTimeOnPage);
    };
  }, []);

  return null;
}
