"use client";

import { useEffect } from "react";

// The Silktide consent banner (see consent-manager.tsx) stays mounted
// everywhere — including inside the logged-in product — so a consent
// choice made on the marketing site keeps re-arming PostHog on every page
// load in-app too (see posthog-provider.tsx's comment on why init has to
// happen via that same consent-change callback). This component only hides
// the visual banner/icon while inside the product; it doesn't unmount the
// library or touch consent state. #stcm-wrapper is appended by the library
// directly to <body>, outside this component's own subtree, so there's no
// ancestor selector to hide it with — a body class + the matching CSS rule
// in globals.css (`body.hide-cookie-ui #stcm-wrapper`) is the only way to
// scope this by route without touching the library itself.
export function HideCookieUi() {
  useEffect(() => {
    document.body.classList.add("hide-cookie-ui");
    return () => document.body.classList.remove("hide-cookie-ui");
  }, []);

  return null;
}
