"use client";

import Script from "next/script";
import { initPostHog } from "@/lib/analytics/posthog-client";
import { runCaptureNatively } from "@/lib/tracking-snippet";

// Silktide Consent Manager (https://silktide.com/consent-manager, open
// source: https://github.com/silktide/consent-manager) — free cookie
// consent banner. Vendored into public/vendor/ (from release v2.0.1)
// rather than loaded off jsDelivr: EasyPrivacy and similar ad-block filter
// lists block any script whose path contains "consent-manager" regardless
// of domain, so the jsDelivr version silently failed for a meaningful
// share of real visitors. Serving it same-origin under a neutral filename
// avoids both the domain-based and path-based blocking, at the cost of a
// manual re-copy from GitHub if we ever bump the version.
const BASE_URL = "/vendor";

declare global {
  interface Window {
    silktideConsentManager?: {
      init: (config: SilktideConfig) => void;
      update: (config: Partial<SilktideConfig>) => void;
      getInstance: () => { toggleModal: (show: boolean) => void } | null;
      resetConsent: () => void;
    };
  }
}

interface SilktideConsentType {
  id: string;
  label: string;
  description: string;
  required?: boolean;
  defaultValue?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}

interface SilktideConfig {
  consentTypes: SilktideConsentType[];
  icon?: { position?: "bottomLeft" | "bottomRight" };
}

// PostHog ("analytics") and the signup-attribution capture ("marketing")
// are wired directly as onAccept callbacks here — Silktide re-runs every
// already-granted category's onAccept on every page load (not just the
// moment consent is given), so this single init() call is the one place
// that needs to know about either, no separate consent-polling component
// needed (contrast the old Cookiebot version of this, which had to listen
// for a window event from a second component).
function initConsentManager() {
  window.silktideConsentManager?.init({
    icon: { position: "bottomRight" },
    consentTypes: [
      {
        id: "essential",
        label: "Essential",
        description: "Needed for the site to work at all — staying signed in, remembering your last filter tab. Always on.",
        required: true,
        defaultValue: true,
      },
      {
        id: "analytics",
        label: "Analytics",
        description: "Lets us see how Getrive is actually used (PostHog: page views, clicks, session recordings) so we can fix what's confusing or broken.",
        defaultValue: false,
        onAccept: () => initPostHog(),
      },
      {
        id: "marketing",
        label: "Attribution",
        description: "Connects a signup back to the specific reply or post that brought you here, so we can tell which channels are actually working.",
        defaultValue: false,
        onAccept: () => runCaptureNatively(),
      },
    ],
  });
}

export function ConsentManager() {
  return (
    <>
      <link rel="stylesheet" href={`${BASE_URL}/getrive-cookie-prefs.css`} />
      <Script src={`${BASE_URL}/getrive-cookie-prefs.js`} strategy="afterInteractive" onLoad={initConsentManager} />
    </>
  );
}
