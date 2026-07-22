import { pollAllSources } from "@/lib/reddit/poll";
import { runIngestionSweep } from "@/lib/services/ingestion-run.service";

// Reddit's rate limit forces ~1 minute of spacing per Reddit source in the
// batch (see poll.ts) — a few minutes of wall-clock time per run, well past
// most serverless defaults. Raised from 300s to 800s (Vercel Pro's GA
// maximum, see https://vercel.com/docs/functions/configuring-functions/duration#duration-limits)
// so a sweep spends far less time getting cut off mid-run and rotating
// leftover sources to the next invocation — see poll.ts's own
// RUN_TIME_BUDGET_MS, scaled to match.
export const maxDuration = 800;

// Invoked by an external scheduler (Vercel Cron, a GitHub Action, a plain
// cron job hitting this URL, etc.) with:
//   Authorization: Bearer <CRON_SECRET>
// Runs search-mode ingestion right after polling in the same invocation —
// scoring whatever search-mode measurement has already backfilled is fast
// and has no external rate limit (see ingestion-run.service.ts), so it
// piggybacks on poll's own trigger instead of needing a separate one.
// Measurement itself (query generation + Reddit/Stack Exchange search)
// stays on its own schedule (see cron/measure-signals) since it's
// genuinely slower and real-rate-limited.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const poll = await pollAllSources();
  let ingest;
  try {
    ingest = await runIngestionSweep();
  } catch (error) {
    console.error("[cron/poll-signals] chained ingestion failed", error);
  }
  return Response.json({ poll, ingest });
}
