import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

// PostHog is deliberately NOT initialized here. instrumentation-client.ts is
// bundled by Next.js as its own separate entry point/module graph from the
// regular component tree — initializing posthog-client.ts's singleton here
// would initialize a *different* copy of that module than the one React
// components import, leaving `track()` calls from components silently
// no-op'd forever (confirmed empirically: config.js loaded, but zero capture
// requests ever fired). See components/analytics/posthog-provider.tsx for
// where this actually happens instead, and why.
