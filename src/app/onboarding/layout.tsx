import type { Metadata } from "next";
import Script from "next/script";
import { requireSession } from "@/lib/session";
import { brandSans, brandMono } from "@/lib/fonts";
import { appUrl } from "@/lib/config";
import { reportSnippetBodyFor } from "@/lib/tracking-snippet";
import { IdentifyUser } from "@/components/analytics/identify-user";
import { HideCookieUi } from "@/components/analytics/hide-cookie-ui";

// Requires a session — nothing here for search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Reachable any time to create an additional project — not just once ever
// — so it deliberately does NOT redirect away when the founder already has
// completed projects.
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive min-h-[100dvh] bg-background font-sans text-foreground`}
    >
      {/* Onboarding lives outside the (app) route group, so AppLayout's own
          IdentifyUser never mounts for it — a founder who drops off
          mid-wizard (the most common single-day-user drop-off point) was
          never linked to their pre-signup anonymous activity at all. This
          is the earliest point after signIn() where a real session exists. */}
      <IdentifyUser userId={session.user.id} />
      <HideCookieUi />
      {children}
      {/* Report half of Getrive's own signup-attribution dogfooding — see
          app/layout.tsx for the capture half and the comment there for the
          full picture. This is Getrive's own post-signup landing page for
          both credentials and Google signups (see (auth)/actions.ts and
          projects/page.tsx's redirect chain), so it's the right spot for
          the report snippet, same as founders are told to use their own
          welcome/thank-you page. The snippet no-ops and is a no-op on every
          visit except the one right after a tagged-link signup — it only
          sends when localStorage still has the capture script's token, and
          clears it immediately after, so it's safe on a page reachable
          more than once (e.g. starting a second project later). */}
      <Script
        id="getrive-attr-report"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: reportSnippetBodyFor(appUrl) }}
      />
    </div>
  );
}
