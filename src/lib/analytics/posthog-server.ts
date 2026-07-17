import * as Sentry from "@sentry/nextjs";
import { isLocalDev } from "@/lib/limits";

// Server-side counterpart to lib/analytics/posthog-client.ts — that module
// only runs in the browser (posthog-js), so cron/poll/server-action code
// paths (e.g. Signal Scoring finishing a run, an onboarding step completing
// via a server-side redirect) have had no way to emit an event at all until
// now. This posts directly to PostHog's capture endpoint instead of pulling
// in posthog-node, since server-side usage here is a handful of one-off
// events, not the batched/queued volume that package is built for.
// NEXT_PUBLIC_POSTHOG_HOST is the ingestion host ("eu.i.posthog.com") — the
// one the client SDK posts events to. POSTHOG_API_HOST (a different var, see
// .env.example) points at the app/management host instead ("eu.posthog.com",
// used by scripts/posthog-dashboard.ts for the read-only Personal API) and
// has no /capture/ endpoint, so it's deliberately not used here.
const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

function currentEnvironmentLabel() {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
}

// distinctId should be the same id passed to identifyUser() client-side
// (session.user.id) so a person's server- and client-emitted events land on
// one PostHog profile instead of two.
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!apiKey) {
    console.log(`[posthog:not-configured] event=${event} distinctId=${distinctId}`, properties ?? {});
    return;
  }
  // Mirrors the client's isTrackingEnvironment guard — only `next dev`
  // reports isLocalDev true (see lib/limits.ts), so preview deploys still
  // send (tagged `environment` below, same as the client) rather than
  // silently going dark.
  if (isLocalDev) return;

  try {
    const response = await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: { ...properties, environment: currentEnvironmentLabel() },
      }),
    });
    if (!response.ok) {
      console.error(`[posthog:server] capture failed for "${event}"`, response.status);
    }
  } catch (error) {
    console.error(`[posthog:server] capture threw for "${event}"`, error);
    Sentry.captureException(error, { tags: { feature: "posthog-server-capture", event } });
  }
}
