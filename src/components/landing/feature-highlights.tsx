import { Plus, Radio, Users } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { Counter } from "@/components/landing/counter";
import { TerminalLoop } from "@/components/landing/terminal-loop";

export function FeatureHighlights() {
  return (
    <section className="relative w-full border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <Reveal className="mb-16">
          <span
            className="inline-block rounded-full px-3 py-1 font-mono text-[11px] font-medium tracking-widest uppercase"
            style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)", color: "var(--accent-glow)" }}
          >
            Capabilities
          </span>
        </Reveal>

        <div className="grid auto-rows-auto grid-cols-1 gap-6 md:auto-rows-[280px] md:grid-cols-3">
          <Reveal delayMs={150} className="col-span-1 md:col-span-2">
            <div className="landing-panel landing-panel-interactive group flex h-full flex-col justify-between p-10">
              <div>
                <h3 className="mb-4 text-3xl font-semibold text-foreground">Wide-spectrum listening</h3>
                <p className="max-w-md text-[15px] leading-relaxed font-light text-muted-foreground">
                  Tap directly into the communities where your actual users hold raw, honest discussions.
                </p>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-background px-5 py-3 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:text-[var(--accent-glow)] hover:shadow-[inset_0_0_0_1px_var(--accent-glow)]">
                  <Radio className="size-5" style={{ color: "#ff4500" }} />
                  Reddit
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-background px-5 py-3 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:text-[var(--accent-glow)] hover:shadow-[inset_0_0_0_1px_var(--accent-glow)]">
                  <Radio className="size-5" style={{ color: "#ff6600" }} />
                  Hacker News
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-background px-5 py-3 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-all hover:text-[var(--accent-glow)] hover:shadow-[inset_0_0_0_1px_var(--accent-glow)]">
                  <Users className="size-5" style={{ color: "#6be0a4" }} />
                  IndieHackers
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-background px-5 py-3 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
                  <Plus className="size-4" style={{ color: "var(--accent-glow)" }} />
                  More channels — planned
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={300}>
            <div
              className="landing-panel landing-panel-interactive flex h-full flex-col justify-between p-10"
              style={{ backgroundImage: "radial-gradient(ellipse at top right, color-mix(in oklch, var(--accent-glow), transparent 85%) 0%, transparent 70%)" }}
            >
              <div>
                <h3 className="mb-4 text-3xl font-semibold text-foreground">Relevance scoring</h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">
                  Every post is read against your product, not keyword-matched.
                </p>
              </div>
              <div className="relative mt-auto flex items-end gap-2 font-mono" style={{ color: "var(--accent-glow)" }}>
                <div
                  className="absolute bottom-4 left-6 size-16 rounded-full blur-2xl"
                  style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 70%)" }}
                />
                <span className="relative z-10 text-7xl font-bold tracking-tighter drop-shadow-[0_0_15px_rgba(107,224,164,0.6)]">
                  <Counter target={70} suffix="%" />
                </span>
                <span className="relative z-10 mb-2 text-sm font-medium tracking-widest opacity-80">
                  default threshold
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={150}>
            <div className="landing-panel landing-panel-interactive group flex h-full flex-col justify-between overflow-hidden p-10">
              <div
                aria-hidden
                className="landing-conveyor pointer-events-none absolute inset-0 opacity-[0.05] transition-opacity group-hover:opacity-15"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, transparent 25%, var(--accent-glow) 25%, var(--accent-glow) 50%, transparent 50%, transparent 75%, var(--accent-glow) 75%, var(--accent-glow) 100%)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="relative z-10">
                <h3 className="mb-4 text-3xl font-semibold text-foreground transition-colors group-hover:text-[var(--accent-glow)]">
                  Attribution tracking
                </h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">
                  Trace a specific reply straight to a real signup, so &ldquo;did this work&rdquo; has a real
                  answer.
                </p>
              </div>
              <div className="relative z-10 mt-auto rounded-lg border border-border bg-background/80 p-4 font-mono text-[11px] tracking-widest text-muted-foreground uppercase transition-colors group-hover:border-[var(--accent-glow)]/50">
                <span className="font-bold" style={{ color: "var(--accent-glow)" }}>
                  /r/&#123;id&#125;
                </span>
                <br />
                <span className="mt-2 block opacity-50">→ tracked link → signup</span>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={300} className="col-span-1 md:col-span-2">
            <div className="landing-panel landing-panel-interactive group flex h-full flex-col items-center gap-10 p-10 md:flex-row">
              <div className="md:w-1/2">
                <h3 className="mb-4 text-3xl font-semibold text-foreground transition-colors group-hover:text-[var(--accent-glow)]">
                  Tailored to your product
                </h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">
                  Getrive reads your product description and positioning so it never invents features you don&apos;t
                  actually have.
                </p>
              </div>
              <div className="relative h-full max-h-[200px] w-full overflow-hidden rounded-lg border border-border/50 bg-background/80 p-6 font-mono text-[12px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)] transition-shadow group-hover:shadow-[inset_0_0_0_1px_var(--accent-glow)] md:w-1/2">
                <div
                  className="absolute top-0 left-0 h-[2px] w-full [animation:landing-scan-sweep_3s_linear_infinite]"
                  style={{ backgroundColor: "var(--accent-glow)", boxShadow: "0 0 10px var(--accent-glow)" }}
                />
                <TerminalLoop />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
