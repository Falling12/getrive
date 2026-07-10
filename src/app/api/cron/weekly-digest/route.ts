import { sendWeeklyDigests } from "@/lib/services/notification.service";

// Invoked by an external scheduler (Vercel Cron, etc.) with:
//   Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const summary = await sendWeeklyDigests();
  return Response.json(summary);
}
