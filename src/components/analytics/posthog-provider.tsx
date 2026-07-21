"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { capturePageview } from "@/lib/analytics/posthog-client";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = searchParams?.size ? `${pathname}?${searchParams.toString()}` : pathname;
    capturePageview(window.location.origin + url);
  }, [pathname, searchParams]);

  return null;
}

// Mounted once in the root layout. initPostHog() itself is no longer
// called from here — it's wired as the "analytics" category's onAccept
// callback in components/analytics/consent-manager.tsx, since that's the
// one place that already knows when consent was actually granted (both on
// a fresh Accept and on every later page load for a returning visitor with
// consent already on file). This component only owns pageview capture,
// which is itself a no-op (see capturePageview in posthog-client.ts) until
// PostHog has actually been initialized by that callback.
export function PostHogProvider() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
