import { runMeasurementSweep } from "@/lib/services/measurement-run.service";

// A single product's Reddit-throttled backfill can exceed this on its own
// (see measurement-run.service.ts) — Vercel's own hard timeout is the
// accepted safety net there, not something this route works around. Raised
// from 300s to 800s (Vercel Pro's GA maximum) so a sweep covers meaningfully
// more products before hitting that ceiling — see
// measurement-run.service.ts's RUN_TIME_BUDGET_MS, scaled to match.
export const maxDuration = 800;

// Invoked by an external scheduler (Vercel Cron, a GitHub Action, a plain
// cron job hitting this URL, etc.) with:
//   Authorization: Bearer <CRON_SECRET>
// Same auth shape as cron/poll-signals — see that route's comment.
// Search-mode ingestion runs from cron/poll-signals instead (chained after
// polling, since scoring is fast and has no rate limit of its own) rather
// than from here — measurement stays on its own schedule since it's
// genuinely slower and real-rate-limited (Reddit/Stack Exchange search).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await runMeasurementSweep();
  return Response.json(summary);
}
