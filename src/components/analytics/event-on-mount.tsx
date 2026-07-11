"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/posthog-client";

// Small generic bridge for firing a named event from an otherwise-server
// page (e.g. verify-email, which only knows the outcome server-side).
export function EventOnMount({ event, properties }: { event: string; properties?: Record<string, unknown> }) {
  useEffect(() => {
    track(event, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);

  return null;
}
