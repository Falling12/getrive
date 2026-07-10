import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { brandSans, brandMono } from "@/lib/fonts";
import { TopoBackdrop } from "@/components/shared/topo-backdrop";

// Everything under here requires a session — nothing for a crawler to
// index behind the login wall, so keep it out of search entirely.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Shared visual shell only (theme, fonts, backdrop) — applied to both the
// /projects picker and every /projects/[projectId]/* page. Project-specific
// concerns (ownership check, sidebar, switcher data) live one level down in
// projects/[projectId]/layout.tsx, since that's the first place in the tree
// that actually has a projectId to work with.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive relative flex h-[100dvh] w-full overflow-hidden bg-background font-sans text-foreground`}
    >
      <TopoBackdrop />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-background/40 to-background/95"
      />
      {children}
    </div>
  );
}
