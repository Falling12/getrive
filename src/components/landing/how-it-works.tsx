import { Brain, Filter, Zap } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const STEPS = [
  {
    number: "1",
    icon: Filter,
    title: "Continuous ingestion",
    body: "Ears on the ground — real-time polling of the Reddit subreddits, Hacker News feed, and other channels you choose, fairly, oldest-checked-first.",
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
            <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              How Getrive finds the conversation.
            </h2>
          </div>
          <p className="max-w-sm text-lg leading-relaxed font-light text-muted-foreground">
            No spam, no automation of what you say — Getrive does the watching so you can spend your time on real
            conversations.
          </p>
        </Reveal>

        <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="absolute top-[60px] left-20 z-0 hidden h-px w-[calc(100%-160px)] bg-border md:block" />

          {STEPS.map((step, index) => (
            <Reveal key={step.number} delayMs={150 * (index + 1)}>
              <div className="landing-panel landing-panel-interactive group relative z-10 p-10 pt-16">
                <div className="landing-node-badge absolute top-0 right-10 flex size-14 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background font-mono text-xl text-muted-foreground/60 transition-colors group-hover:text-[var(--accent-glow)]">
                  {step.number}
                </div>
                <div className="mb-8 text-muted-foreground/40">
                  <step.icon className="size-9 transition-colors group-hover:text-foreground" />
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
