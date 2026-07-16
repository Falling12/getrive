import { Ear, Volume2 } from "lucide-react";
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
          <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-1.5 font-mono text-[11px] tracking-widest text-destructive uppercase shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--destructive),transparent_70%)]">
            <span className="size-1.5 animate-ping rounded-full bg-destructive" />
            The problem
          </span>
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
            <div className="landing-panel landing-panel-lift landing-alert-pulse group relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-gradient-to-b from-background to-[#1a1111] p-10">
              <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-destructive/10 blur-2xl transition-all duration-700 group-hover:bg-destructive/20" />
              <div>
                <div className="mb-8 flex items-center gap-3 font-mono text-[11px] font-medium tracking-widest text-destructive/70 uppercase">
                  <Volume2 className="size-5 animate-pulse text-destructive" />
                  Broadcasting
                </div>
                <h3 className="mb-4 text-3xl font-semibold text-foreground">Cold automation</h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">
                  Scraping generic lists. Formatting CSVs. Blasting untargeted emails into spam folders, to people
                  who never asked for your solution.
                </p>
              </div>
              <div className="mt-8 flex justify-between border-t border-destructive/20 pt-6 font-mono text-[11px] tracking-widest uppercase">
                <span className="text-muted-foreground/60">Reply rate</span>
                <span className="font-bold text-destructive drop-shadow-[0_0_8px_rgba(196,84,74,0.5)]">
                  ~<Counter target={0.2} decimals={1} suffix="%" /> noise
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={300}>
            <div className="group relative overflow-hidden rounded-xl p-px transition-transform duration-500 hover:-translate-y-2">
              <div
                aria-hidden
                className="absolute inset-[-100%] opacity-70 transition-opacity [animation:spin_4s_linear_infinite] group-hover:opacity-100"
                style={{
                  backgroundImage:
                    "conic-gradient(from 0deg, transparent 75%, var(--accent-glow) 100%)",
                }}
              />
              <div className="relative flex h-full min-h-[320px] w-full flex-col justify-between rounded-[0.5rem] bg-gradient-to-b from-background to-[#0a1a14] p-10">
                <div
                  className="absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl transition-all duration-700"
                  style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)" }}
                />
                <div>
                  <div
                    className="mb-8 flex items-center gap-3 font-mono text-[11px] font-medium tracking-widest uppercase drop-shadow-[0_0_8px_rgba(107,224,164,0.4)]"
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
                  <span
                    className="font-bold drop-shadow-[0_0_8px_rgba(107,224,164,0.5)]"
                    style={{ color: "var(--accent-glow)" }}
                  >
                    Replies in context, where trust already exists
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
