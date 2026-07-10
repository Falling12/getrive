import Link from "next/link";
import { AuthMark } from "@/components/auth/auth-mark";
import { brandSans, brandMono } from "@/lib/fonts";

// Shared wrapper for standalone public pages (Terms, Privacy) — reachable
// whether signed in or not, so it lives outside both (auth)'s
// redirect-if-signed-in and (app)'s requireSession gates.
export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${brandSans.variable} ${brandMono.variable} theme-getrive min-h-[100dvh] bg-background font-sans text-foreground`}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-6">
          <Link href="/" className="w-fit">
            <AuthMark />
          </Link>
          <div>
            <h1 className="text-2xl font-medium tracking-wide text-foreground">{title}</h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">Last updated {updated}</p>
          </div>
        </header>

        <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground/90 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-4 [&_h2]:font-mono [&_h2]:text-[11px] [&_h2]:tracking-widest [&_h2]:text-muted-foreground [&_h2]:uppercase [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>

        <footer className="flex gap-4 border-t border-border pt-6 font-mono text-[11px] text-muted-foreground">
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/" className="ml-auto transition-colors hover:text-foreground">
            Back to Getrive
          </Link>
        </footer>
      </div>
    </div>
  );
}
