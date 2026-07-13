import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AuthMark } from "@/components/auth/auth-mark";
import { brandSans, brandMono } from "@/lib/fonts";
import { RouteLoading } from "@/components/shared/route-loading";

// This route has no shared layout of its own (see the comment on
// page.tsx) — its fonts/backdrop/shell are set up inline in the page, so
// the loading fallback has to reproduce that same shell rather than
// dropping RouteLoading onto an unstyled root layout background.
export default function Loading() {
  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-12 font-sans text-foreground`}
    >
      <AuthBackdrop />
      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center text-center">
        <AuthMark withWordmark={false} className="mb-8 justify-center" />
        <RouteLoading label="Verifying email…" />
      </div>
    </div>
  );
}
