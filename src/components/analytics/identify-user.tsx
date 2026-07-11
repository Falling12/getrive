"use client";

import { useEffect } from "react";
import { identifyUser } from "@/lib/analytics/posthog-client";

// Mounted once per authenticated layout — links this browser's anonymous
// pre-signup activity (landing page visit, signup funnel) to the real user,
// via PostHog's standard identify() merge. Never pass email/name here — see
// PRIVACY constraints (user id + category-level properties only).
export function IdentifyUser({ userId }: { userId: string }) {
  useEffect(() => {
    identifyUser(userId);
  }, [userId]);

  return null;
}
