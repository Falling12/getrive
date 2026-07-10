import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { brandSans, brandMono } from "@/lib/fonts";

// Requires a session — nothing here for search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Reachable any time to create an additional project — not just once ever
// — so it deliberately does NOT redirect away when the founder already has
// completed projects.
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive min-h-[100dvh] bg-background font-sans text-foreground`}
    >
      {children}
    </div>
  );
}
