import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // The 2026-07 IA consolidation folded five surfaces into three: Dashboard
  // and Signals became Home, Positioning/Sources/Search became Targeting,
  // Users became Results. Old segments live on in sent notification emails
  // and bookmarks, so they redirect (temporary, not 308 — cheap to remap if
  // the IA shifts again). Query strings pass through automatically, which
  // keeps `?tour=1` and filter params working. /signals/[id] detail pages
  // still exist and are deliberately NOT matched here (`/signals` matches
  // only the exact path, no nested segments).
  async redirects() {
    return [
      { source: "/projects/:projectId/dashboard", destination: "/projects/:projectId/home", permanent: false },
      { source: "/projects/:projectId/signals", destination: "/projects/:projectId/home", permanent: false },
      { source: "/projects/:projectId/positioning", destination: "/projects/:projectId/targeting", permanent: false },
      { source: "/projects/:projectId/sources", destination: "/projects/:projectId/targeting", permanent: false },
      { source: "/projects/:projectId/search", destination: "/projects/:projectId/targeting", permanent: false },
      { source: "/projects/:projectId/users", destination: "/projects/:projectId/results", permanent: false },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // No auth token configured yet (Sentry account not provisioned) — source
  // map upload silently no-ops rather than failing the build.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
});
