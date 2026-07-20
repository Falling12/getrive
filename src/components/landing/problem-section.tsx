import { Ear, LockKeyhole, Volume2 } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { Counter } from "@/components/landing/counter";

export function ProblemSection() {
  return (
    <section id="problem" className="relative w-full overflow-hidden border-t border-border/60 py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ backgroundColor: "color-mix(in oklch, var(--destructive), transparent 80%)" }}
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 lg:px-8">
        <Reveal className="mx-auto mb-16 max-w-2xl space-y-5 text-center md:mb-20">
          <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Cold outreach is broken.{" "}
            <span style={{ color: "var(--accent-glow)" }}>Listening isn&apos;t.</span>
          </h2>
          <p className="text-lg leading-relaxed font-light text-muted-foreground">
            Spamming templates destroys brand equity. Getrive works differently: you only reach out where someone
            has already said, out loud, that they have the problem.
          </p>
        </Reveal>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          <Reveal delayMs={150}>
            <div className="landing-panel landing-panel-lift flex min-h-[320px] flex-col justify-between bg-background p-10">
              <div>
                <div className="mb-8 flex items-center gap-3 font-mono text-[11px] font-medium tracking-widest text-destructive/70 uppercase">
                  <Volume2 className="size-5 text-destructive" />
                  Broadcasting
                </div>
                <h3 className="mb-4 text-3xl font-semibold text-foreground">Cold automation</h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">
                  Scraping generic lists. Formatting CSVs. Blasting untargeted emails into spam folders, to people
                  who never asked for your solution.
                </p>
              </div>
              <div className="mt-8 flex justify-between border-t border-border pt-6 font-mono text-[11px] tracking-widest uppercase">
                <span className="text-muted-foreground/60">Reply rate</span>
                <span className="font-bold text-destructive">
                  ~<Counter target={0.2} decimals={1} suffix="%" /> noise
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={300}>
            <div className="landing-panel landing-panel-lift flex min-h-[320px] flex-col justify-between bg-background p-10">
              <div>
                <div
                  className="mb-8 flex items-center gap-3 font-mono text-[11px] font-medium tracking-widest uppercase"
                  style={{ color: "var(--accent-glow)" }}
                >
                  <Ear className="size-5" />
                  Listening
                </div>
                <h3 className="mb-4 text-3xl font-semibold text-foreground">Listening where it counts</h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">
                  Scanning real conversations to find the handful of people who just described the exact problem
                  you solve, today.
                </p>
              </div>
              <div
                className="mt-8 flex justify-between border-t pt-6 font-mono text-[11px] tracking-widest uppercase"
                style={{ borderColor: "color-mix(in oklch, var(--accent-glow), transparent 70%)" }}
              >
                <span className="text-muted-foreground/60">Reply rate</span>
                <span className="font-bold" style={{ color: "var(--accent-glow)" }}>
                  Replies in context, where trust already exists
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal
          id="trust"
          className="mx-auto mt-8 flex max-w-5xl scroll-mt-24 flex-col items-center gap-6 rounded-xl border border-border bg-background px-8 py-8 text-center md:flex-row md:justify-between md:text-left"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background shadow-[inset_0_0_0_1px_var(--border)]">
              <LockKeyhole className="size-5" style={{ color: "var(--accent-glow)" }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Nothing posted without you.</h3>
              <p className="text-[14px] leading-relaxed font-light text-muted-foreground">
                Getrive drafts, it doesn&apos;t post — you decide what goes out, every time.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-4 rounded-lg border border-border px-5 py-3 font-mono text-[11px] tracking-widest text-foreground">
            <span className="text-muted-foreground uppercase">Auto-reply systems</span>
            <span className="landing-toggle-track relative h-6 w-12 overflow-hidden rounded-full bg-secondary shadow-inner">
              <span className="landing-toggle-thumb absolute top-1 right-1 size-4 rounded-full bg-[var(--accent-glow)]" />
            </span>
            <span className="font-bold tracking-[0.2em] text-destructive uppercase">Disabled by design</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
