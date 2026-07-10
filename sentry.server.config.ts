import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Silent no-op if SENTRY_DSN is unset (local dev, or before the account is
  // provisioned) — Sentry.init tolerates an undefined dsn by disabling itself.
});
