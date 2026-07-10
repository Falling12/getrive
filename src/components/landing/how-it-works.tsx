import { Brain, Filter, Zap } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const STEPS = [
  {
    number: "1",
    icon: Filter,
    title: "Continuous ingestion",
    body: "Ears on the ground — real-time polling of the Reddit subreddits and Hacker News feed you choose, fairly, oldest-checked-first.",
  },
  {
    number: "2",
    icon: Brain,
    title: "Relevance scoring",
    body: "Every post gets read against your product's actual pain point, not keyword-matched. Only genuine, high-intent matches ever reach you.",
  },
  {
    number: "3",
    icon: Zap,
    title: "Contextual draft",
    body: "Using your product's positioning and the post's own wording, Getrive drafts a specific, honest reply ready for your review.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative w-full border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <Reveal className="mb-20 flex flex-col items-end justify-between gap-6 md:flex-row">
          <div>
            <span
              className="inline-block rounded-full px-3 py-1 font-mono text-[11px] font-medium tracking-widest uppercase"
              style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)", color: "var(--accent-glow)" }}
            >
              System arc
            </span>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              How the instrument reads the room.
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-relaxed font-light text-muted-foreground">
            No spam, no automation of what you say — Getrive does the watching so you can spend your time on real
            conversations.
          </p>
        </Reveal>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="absolute top-[60px] left-20 z-0 hidden h-[2px] w-[calc(100%-160px)] overflow-hidden rounded-full bg-border/50 md:block">
            <div
              className="landing-flow-dot absolute top-0 h-full w-8 rounded-full"
              style={{ backgroundColor: "var(--accent-glow)", boxShadow: "0 0 15px var(--accent-glow)" }}
            />
          </div>

          {STEPS.map((step, index) => (
            <Reveal key={step.number} delayMs={150 * (index + 1)}>
              <div className="landing-panel landing-panel-interactive group relative z-10 p-10 pt-16">
                <div
                  className="landing-node-badge absolute top-0 right-10 flex size-14 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background font-mono text-xl text-muted-foreground/60 shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-colors group-hover:text-[var(--accent-glow)]"
                  style={{ boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}
                >
                  {step.number}
                </div>
                <div className="relative mb-8 text-muted-foreground/40">
                  <div
                    className="absolute inset-0 rounded-full opacity-0 blur-xl transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 80%)" }}
                  />
                  <step.icon className="relative z-10 size-9 transition-transform group-hover:scale-110 group-hover:text-foreground" />
                </div>
                <h3 className="mb-4 text-2xl font-semibold text-foreground transition-colors group-hover:text-[var(--accent-glow)]">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
