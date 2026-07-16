import Link from "next/link";
import { AuthMark } from "@/components/auth/auth-mark";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-border/60 bg-background py-10">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-4 lg:flex-row lg:px-8">
        <AuthMark />
        <div
          className="flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] tracking-widest uppercase"
          style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)", color: "var(--accent-glow)" }}
        >
          <span
            className="size-1.5 animate-[auth-pulse-slow_3s_ease-in-out_infinite] rounded-full"
            style={{ backgroundColor: "var(--accent-glow)", boxShadow: "0 0 8px var(--accent-glow)" }}
          />
          Listening now
        </div>
        <div className="flex gap-6 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          <Link href="/terms" className="transition-colors hover:text-[var(--accent-glow)]">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-[var(--accent-glow)]">
            Privacy
          </Link>
          <Link href="/login" className="transition-colors hover:text-[var(--accent-glow)]">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
