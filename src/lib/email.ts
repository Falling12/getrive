import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Getrive <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

// Every code path that needs real delivery (verification, password reset)
// calls this. Without a configured API key we log instead of throwing, so
// local dev and CI never break on a missing secret — but this must not ship
// to production unconfigured, since password reset genuinely depends on it.
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  if (!resend) {
    console.log(`[email:not-configured] to=${to} subject="${subject}"\n${html}`);
    return { sent: false };
  }

  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    console.error(`[email:send-failed] to=${to} subject="${subject}"`, error);
    Sentry.captureException(new Error(`Resend send failed: ${error.message}`), {
      tags: { subject },
    });
    return { sent: false };
  }
  return { sent: true };
}
