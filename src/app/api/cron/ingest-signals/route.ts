import { runIngestionSweep } from "@/lib/services/ingestion-run.service";

// Ingestion has no external rate limit (see ingestion-run.service.ts), so
// this should finish well within Vercel's default timeout even at real
// volume — kept at 300 to match every other cron route in this app rather
// than tuning it down speculatively.
export const maxDuration = 300;

// Invoked by an external scheduler with:
//   Authorization: Bearer <CRON_SECRET>
// Same auth shape as cron/poll-signals and cron/measure-signals. Gating to
// allowlisted accounts happens inside runIngestionSweep, not here.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await runIngestionSweep();
  return Response.json(summary);
}
