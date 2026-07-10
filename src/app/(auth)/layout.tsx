import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { brandSans, brandMono } from "@/lib/fonts";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AuthMark } from "@/components/auth/auth-mark";
import { AuthStatusBadge } from "@/components/auth/auth-status-badge";

// Login/signup/password-reset forms — no reason for these to rank in search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) {
    redirect("/projects");
  }

  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-12 font-sans text-foreground`}
    >
      <AuthBackdrop />

      <AuthMark
        className="animate-[auth-fade-in_0.5s_ease-out_forwards] absolute top-8 left-8 hidden opacity-0 md:flex"
        style={{ animationDelay: "0.6s" }}
      />
      <AuthStatusBadge />

      <main
        className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] relative z-10 flex w-full max-w-[400px] flex-col items-center opacity-0"
        style={{ animationDelay: "0.1s" }}
      >
        {children}
      </main>

      <footer className="absolute bottom-6 z-10 flex gap-4 font-mono text-[10px] text-muted-foreground/60">
        <Link href="/terms" className="transition-colors hover:text-muted-foreground">
          Terms
        </Link>
        <Link href="/privacy" className="transition-colors hover:text-muted-foreground">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
