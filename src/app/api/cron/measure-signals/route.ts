import { runMeasurementSweep } from "@/lib/services/measurement-run.service";

// A single product's Reddit-throttled backfill can exceed this on its own
// (see measurement-run.service.ts) — Vercel's own hard timeout is the
// accepted safety net there, not something this route works around.
export const maxDuration = 300;

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
