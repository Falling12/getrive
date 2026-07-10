import { pollAllSources } from "@/lib/reddit/poll";

// Reddit's rate limit forces ~1 minute of spacing per Reddit source in the
// batch (see poll.ts) — a few minutes of wall-clock time per run, well past
// most serverless defaults.
export const maxDuration = 300;

// Invoked by an external scheduler (Vercel Cron, a GitHub Action, a plain
// cron job hitting this URL, etc.) with:
//   Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await pollAllSources();
  return Response.json(summary);
}
