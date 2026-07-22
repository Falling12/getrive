// Usage caps — the free tier is currently the only tier, and Signal Scoring
// (an AI call per new Reddit post) is the highest-volume, least-supervised
// cost in the product. These exist to bound real financial exposure before
// real founders are using this unsupervised, not to nudge toward a paid
// plan (there isn't one yet).

// True only for local `next dev` — Next.js sets NODE_ENV=production for both
// `next build`/production deploys and Vercel preview deploys, so this never
// accidentally disables caps anywhere but a developer's own machine. Used to
// bypass the usage caps below during local testing, where "how many sources
// can I monitor" isn't a real cost/abuse concern the way it is once real
// founders are using this unsupervised. Deliberately does NOT gate the auth
// rate limits in (auth)/actions.ts — those guard against brute force, not cost.
export const isLocalDev = process.env.NODE_ENV !== "production";

// Emails permanently exempt from every usage cap below — currently just the
// founder's own account, for uncapped dogfooding/testing directly against
// production. Not exposed anywhere in the UI; checked server-side only, via
// isExemptFromLimits() below.
//
// Exported (along with isUnlimitedAccount) for
// lib/services/search-pipeline-gate.service.ts, which gates the whole
// search-intelligence pipeline (Phase 1/2/2C/3A) to these accounts only.
// That gate deliberately uses isUnlimitedAccount directly, NOT
// isExemptFromLimits — isExemptFromLimits also passes for isLocalDev
// (true for any non-production run, including every local test script),
// which would make the pipeline gate pass for every account whenever it's
// invoked outside a production deploy — exactly where it's actually run
// and tested. The pipeline gate needs to mean "this specific account",
// full stop, not "this account, or anyone at all in dev".
export const UNLIMITED_ACCOUNT_EMAILS = new Set(["senkcsani@gmail.com", "sonic002.96@gmail.com"]);

export function isUnlimitedAccount(email?: string | null): boolean {
  return !!email && UNLIMITED_ACCOUNT_EMAILS.has(email.toLowerCase());
}

// The one bypass check every cap site below should use (in place of a bare
// isLocalDev), so local dev and an exempted account only ever need adding
// in this one place. Deliberately not used to gate the auth rate limits in
// (auth)/actions.ts — those guard against brute force, not cost, and apply
// before a session/email even exists.
export function isExemptFromLimits(email?: string | null): boolean {
  return isLocalDev || isUnlimitedAccount(email);
}

// Standing, non-resetting cap on completed projects per account (a project
// counts once it has at least one selected: true source — see
// countActiveProjects in lib/account-limits.ts, same definition
// projects/page.tsx already uses for "is this a real project"). Checked at
// two points in onboarding/actions.ts: up front in startOnboardingStep
// (fail before spending an AI call on positioning/source-discovery for a
// project that can't be completed anyway) and again in confirmSourcesAction
// (the actual moment a project becomes "completed", closing the gap where
// two onboarding attempts started in parallel could otherwise both pass the
// early check). Freed only by archiving an existing project, never by time.
export const MAX_PROJECTS_PER_ACCOUNT = 1;

// Enforced on manual "add a source" (src/app/(app)/projects/[projectId]/sources/actions.ts),
// counting all source types combined (Reddit + Hacker News) within that one
// project.
export const MAX_MONITORED_SOURCES = 5;

// Account-wide companion to MAX_MONITORED_SOURCES, the same way
// DAILY_SCORING_CAP_PER_ACCOUNT backstops DAILY_SCORING_CAP_PER_PROJECT: the
// per-project cap alone does nothing to stop one account multiplying its
// total monitored-source count (and therefore scoring volume) by creating
// more projects. Summed across every project the account owns, checked
// everywhere a source flips to selected: true — manual add (sources/actions.ts)
// and onboarding's confirm-sources step (onboarding/actions.ts). This is a
// lifetime/standing cap, not a rolling window like the daily scoring caps
// below — it does not reset on any schedule, only by the founder
// un-monitoring an existing source to free a slot.
export const MAX_MONITORED_SOURCES_PER_ACCOUNT = 8;

// Enforced in /api/poll-stream — separate from the existing per-project
// activePollStartedAt lock, which only stops *overlapping* polls, not rapid
// back-to-back ones once each finishes.
export const MANUAL_POLL_RATE_LIMIT = { max: 3, windowMinutes: 15 };

// Enforced in /api/measure-stream, same shape and reasoning as
// MANUAL_POLL_RATE_LIMIT — bounds how much of Reddit/Stack Exchange's
// shared search quota and query-generation AI cost a project's impatient
// clicking can consume, now that measurement isn't allowlist-only/
// low-volume anymore.
export const MANUAL_MEASUREMENT_RATE_LIMIT = { max: 3, windowMinutes: 15 };

// Soft cap on Signal Scoring calls per project per day (lib/reddit/poll.ts),
// covering all source types combined. Hitting this pauses scoring for that
// project until the window rolls over; already-fetched-but-unscored posts
// are simply re-attempted on a later poll (ScoredPost dedup only records
// posts actually scored).
export const DAILY_SCORING_CAP_PER_PROJECT = 100;

// Soft cap on Signal Scoring calls per ACCOUNT per day, summed across every
// project that account owns (lib/reddit/poll.ts) — closes the gap where the
// per-project cap above does nothing to stop one account from multiplying
// its total AI spend by creating more projects. Deliberately more than
// DAILY_SCORING_CAP_PER_PROJECT so 1-2 genuinely active projects on the same
// account aren't throttled by each other on a busy day, but still bounds
// the account's total blast radius regardless of how many projects exist.
export const DAILY_SCORING_CAP_PER_ACCOUNT = 200;

// After this many consecutive failed fetch attempts for one source, surface
// it as "ingestion failing" (Sources page + Dashboard) rather than letting
// it look like a quiet source with no new posts. An alert-sensitivity
// threshold, not a cost/abuse cap, so it isn't scaled down with the caps
// above.
export const CONSECUTIVE_FAILURE_ALERT_THRESHOLD = 3;

// After this many consecutive polls where the fetch itself succeeded but
// returned zero posts, surface it distinctly from both "ingestion failing"
// (an HTTP/throw error) and "a quiet day" (fetched some posts, none scored
// above threshold) — a healthy response with nothing in it is its own
// failure mode (wrong endpoint, empty-by-construction query, upstream
// serving nothing) and deserves its own alert rather than looking silent.
export const CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD = 2;
