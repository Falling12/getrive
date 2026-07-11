import posthog from "posthog-js";

// Without NEXT_PUBLIC_POSTHOG_KEY, analytics simply never initializes — same
// disable-without-erroring pattern as Sentry (see instrumentation-client.ts)
// and Google auth (isGoogleAuthConfigured()).
export function isPostHogConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
}

let initialized = false;

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

// Real user data shouldn't include noise from local machines. NODE_ENV alone
// isn't enough to detect that: `next build && next start` reports
// NODE_ENV=production even when run on a laptop, and so does a Vercel
// *preview* deployment build — both would otherwise get folded into real
// production analytics with no way to separate them after the fact. Instead
// this checks the actual hostname the page is being served from, which is
// the one thing that's genuinely different between "someone's machine" and
// "the real deployed site" regardless of build mode. Set
// NEXT_PUBLIC_POSTHOG_ENABLE_DEV=true locally on the rare occasion you
// actually need to test the PostHog integration itself against localhost;
// any events that do escape are still tagged `environment` (see below) so
// they're filterable out of production dashboards either way.
function isTrackingEnvironment() {
  if (process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV === "true") return true;
  if (typeof window === "undefined") return false;
  return !LOCAL_HOSTNAMES.has(window.location.hostname) && !window.location.hostname.endsWith(".local");
}

// Best-effort label for the `environment` property below — prefers Vercel's
// own preview/production distinction (NEXT_PUBLIC_VERCEL_ENV, if your
// project has "Automatically expose System Environment Variables" turned on
// in Project Settings; unset otherwise) over guessing from NODE_ENV, since
// Vercel's own signal is authoritative and NODE_ENV can't tell preview and
// production apart at all.
function currentEnvironmentLabel() {
  return process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "unknown";
}

// No consent gate — tracking runs unconditionally (disclosed in the Privacy
// Policy instead of gated behind a banner; see app/privacy/page.tsx). Only
// gated on environment (see isTrackingEnvironment above).
export function initPostHog() {
  if (initialized || !isPostHogConfigured() || !isTrackingEnvironment() || typeof window === "undefined") return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    ui_host: "https://eu.posthog.com",
    // "always" (not "identified_only") so anonymous pre-signup browsing
    // (landing page, scroll depth, CTA clicks) gets full profiles too —
    // identify() at signup then links that history to the real user via
    // PostHog's standard anonymous-id merge, instead of only counting
    // activity from the moment someone becomes "identified".
    person_profiles: "always",
    // Pageviews captured manually (see PostHogPageView below) — the
    // recommended pattern for Next.js App Router, since router transitions
    // aren't real page loads and posthog-js can't see them on its own.
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    // Rage clicks ($rageclick) are detected automatically by posthog-js
    // whenever autocapture is on — no separate flag. Dead clicks need this:
    capture_dead_clicks: true,
    enable_heatmaps: true,
    session_recording: {
      // Password inputs are masked by rrweb/posthog-js regardless of this
      // config — this only adds our own sensitive fields on top (outreach
      // lead name/handle/context; see the `ph-mask` class in those forms).
      maskTextSelector: ".ph-mask",
    },
    persistence: "localStorage+cookie",
    loaded: (ph) => {
      // Belt-and-suspenders: if this ever runs somewhere other than a real
      // production deploy (a preview build, someone flipping the dev
      // override on), every event still carries how to exclude it.
      ph.register({ environment: currentEnvironmentLabel() });
    },
  });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function capturePageview(url: string) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: url });
}

// Call once per authenticated page load — links this browser's prior
// anonymous activity (landing page visit, signup funnel) to the real user.
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(userId, properties);
}

export function resetIdentity() {
  if (!initialized) return;
  posthog.reset();
}

export { posthog };
