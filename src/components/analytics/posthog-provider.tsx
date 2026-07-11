"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { capturePageview, initPostHog } from "@/lib/analytics/posthog-client";

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

// Mounted once in the root layout, first among its siblings. The
// initPostHog() call below happens directly in the render body — not in an
// effect — specifically so it runs during React's render phase, which
// completes for the *entire tree* before any component's effects fire.
// That guarantees PostHog is ready before sibling effects elsewhere (e.g.
// LandingAnalytics's homepage_viewed) that would otherwise race it. Safe to
// call unconditionally: initPostHog() no-ops on the server (and outside a
// tracking environment — see isTrackingEnvironment in posthog-client.ts),
// and this component's JSX output never depends on it, so there's no
// hydration mismatch. Idempotent either way.
export function PostHogProvider() {
  initPostHog();

  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
