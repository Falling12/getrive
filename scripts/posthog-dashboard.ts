// One-off setup script — creates the "Getrive Analytics" dashboard (funnel,
// DAU trend, signups trend, rage/dead-click summary, scroll depth
// distribution) via PostHog's REST API. Run once with:
//   npx tsx -r dotenv/config scripts/posthog-dashboard.ts
// Requires POSTHOG_PERSONAL_API_KEY (server-only — see .env.example).
// Safe to re-run: creates a new dashboard each time rather than mutating an
// existing one, so don't run it repeatedly without cleaning up the old one.

const API_HOST = process.env.POSTHOG_API_HOST || "https://eu.posthog.com";
const PERSONAL_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

if (!PERSONAL_KEY) {
  console.error("Set POSTHOG_PERSONAL_API_KEY in .env first.");
  process.exit(1);
}

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_HOST}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PERSONAL_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method ?? "GET"} ${path} -> ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

const FUNNEL_STEPS = [
  "homepage_viewed",
  "cta_clicked",
  "signup_started",
  "signup_submitted",
  "email_verified",
  "onboarding_step_completed",
  "first_signal_viewed",
  "signal_reply_copied",
  "signal_marked_replied",
];

async function main() {
  console.log("Looking up project...");
  const project = await api("/api/projects/@current/");
  const projectId = project.id;
  console.log("Project:", project.name, projectId);

  console.log("Creating dashboard...");
  const dashboard = await api(`/api/projects/${projectId}/dashboards/`, {
    method: "POST",
    body: JSON.stringify({
      name: "Getrive Analytics",
      description:
        "Homepage -> deep product usage funnel, landing page behavior (scroll depth, rage/dead clicks), and daily active users / signups.",
    }),
  });
  const dashboardId = dashboard.id;
  console.log("Dashboard created:", dashboardId);

  async function createInsight(name: string, query: Record<string, unknown>, description?: string) {
    const insight = await api(`/api/projects/${projectId}/insights/`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        query: { kind: "InsightVizNode", source: query },
        dashboards: [dashboardId],
      }),
    });
    console.log("  Insight created:", name, insight.id);
    return insight;
  }

  console.log("Creating insights...");

  await createInsight(
    "Homepage -> deep product usage funnel",
    {
      kind: "FunnelsQuery",
      series: FUNNEL_STEPS.map((event) => ({ kind: "EventsNode", event })),
      filterTestAccounts: true,
    },
    "Full chain from homepage_viewed through signal_marked_replied."
  );

  await createInsight(
    "Daily active users",
    {
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event: "$pageview", math: "dau", custom_name: "Daily active users" }],
      interval: "day",
      filterTestAccounts: true,
    },
    "Unique visitors per day, any page."
  );

  await createInsight(
    "New signups per day",
    {
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event: "signup_submitted", math: "total", custom_name: "Signups submitted" }],
      interval: "day",
      filterTestAccounts: true,
    },
    "Count of signup form submissions per day (attempts, not just successes — compare against email_verified in the funnel above for actual completions)."
  );

  await createInsight(
    "Rage clicks & dead clicks",
    {
      kind: "TrendsQuery",
      series: [
        { kind: "EventsNode", event: "$rageclick", math: "total", custom_name: "Rage clicks" },
        { kind: "EventsNode", event: "$dead_click", math: "total", custom_name: "Dead clicks" },
      ],
      interval: "day",
      filterTestAccounts: true,
    },
    "Frustration signals — repeated rapid clicking (rage) and clicks on non-interactive elements (dead). Verify the $dead_click event name matches what your PostHog version emits if this looks empty."
  );

  await createInsight(
    "Landing page scroll depth distribution",
    {
      kind: "TrendsQuery",
      series: [{ kind: "EventsNode", event: "scroll_depth_reached", math: "total" }],
      breakdownFilter: { breakdowns: [{ property: "percent", type: "event" }] },
      interval: "day",
      filterTestAccounts: true,
    },
    "How far visitors scroll on the homepage — broken down by the 25/50/75/100% checkpoints."
  );

  await api(`/api/projects/${projectId}/insights/`, {
    method: "POST",
    body: JSON.stringify({
      name: "Landing page heatmap (link)",
      query: {
        kind: "InsightVizNode",
        source: { kind: "TrendsQuery", series: [{ kind: "EventsNode", event: "$pageview" }], interval: "day" },
      },
      dashboards: [dashboardId],
      description:
        `Heatmaps aren't an embeddable chart in PostHog — they're an interactive overlay on the real page. ` +
        `View it at ${API_HOST}/heatmaps?pageURL=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_URL || "https://getrive.app")}/ ` +
        `(Toolbar > Heatmaps, or Dashboard > Heatmaps in the left nav). This tile is just a placeholder/reminder — the real view is at that link.`,
    }),
  });

  console.log("\nDone. Dashboard URL:");
  console.log(`${API_HOST}/project/${projectId}/dashboard/${dashboardId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
