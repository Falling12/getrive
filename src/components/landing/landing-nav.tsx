import Link from "next/link";
import { AuthMark } from "@/components/auth/auth-mark";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <AuthMark />
        </div>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#problem" className="transition-colors hover:text-[var(--accent-glow)]">
            The problem
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-[var(--accent-glow)]">
            How it works
          </a>
          <a href="#trust" className="transition-colors hover:text-[var(--accent-glow)]">
            Trust
          </a>
          <a href="#pricing" className="transition-colors hover:text-[var(--accent-glow)]">
            Pricing
          </a>
          <a href="#faq" className="transition-colors hover:text-[var(--accent-glow)]">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Button
            render={<Link href="/signup" />}
            nativeButton={false}
            className="landing-btn-glow rounded-lg font-mono text-[10px] tracking-widest uppercase"
            style={{
              backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)",
              color: "var(--accent-glow)",
              boxShadow: "inset 0 0 0 1px var(--accent-glow)",
            }}
          >
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
