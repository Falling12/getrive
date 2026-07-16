import { ListChecks, Quote } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { TESTIMONIALS } from "@/lib/testimonials";

// Getrive has no paying customers or testimonials yet (early access, per
// the pricing section below) — these are real capabilities described
// honestly, not fabricated user quotes with invented MRR numbers.
const LOGS = [
  {
    id: "Built on itself",
    body: "Getrive finds its own first users the same way — by watching Reddit and Hacker News for founders describing exactly this problem, and drafting a genuine reply.",
    detail: "Built by a solo founder, used on itself daily.",
  },
  {
    id: "Review, always",
    body: "Every draft sits in front of you before anything happens — edit it, regenerate it for a different angle, or ignore it. Nothing sends on its own.",
    detail: "Design principle: nothing posted without you.",
  },
  {
    id: "Real attribution",
    body: "When a reply does bring someone in, a tracked link connects that signup back to the exact post and channel that produced it — not a guess.",
    detail: "Real attribution, not vanity stats.",
  },
];

export function SocialProof() {
  return (
    <section className="relative w-full border-t border-border/60 bg-gradient-to-b from-background to-background/95 py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <Reveal className="mb-20 text-center">
          <span
            className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase"
            style={{ color: "var(--accent-glow)" }}
          >
            <ListChecks className="size-4" />
            In practice
          </span>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Built the way it&apos;s meant to be used.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {LOGS.map((log, index) => (
            <Reveal key={log.id} delayMs={150 * (index + 1)}>
              <div className="landing-panel landing-panel-lift group relative overflow-hidden p-8">
                <div
                  className="absolute top-0 left-0 h-full w-1 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ backgroundColor: "var(--accent-glow)", boxShadow: "0 0 10px var(--accent-glow)" }}
                />
                <div className="mb-6 flex items-center border-b border-border/50 pb-4 font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                  <span
                    className="landing-status-blink mr-3 size-2 rounded-full"
                    style={{ backgroundColor: "var(--accent-glow)", boxShadow: "0 0 6px var(--accent-glow)" }}
                  />
                  <span style={{ color: "var(--accent-glow)" }}>{log.id}</span>
                </div>
                <p className="mb-8 text-[15px] leading-relaxed font-light text-foreground/90">{log.body}</p>
                <div className="mt-auto font-mono text-[11px] tracking-widest text-muted-foreground/70 uppercase">
                  {log.detail}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {TESTIMONIALS.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {TESTIMONIALS.slice(0, 3).map((testimonial, index) => (
              <Reveal key={testimonial.name} delayMs={150 * (index + 1)}>
                <div className="landing-panel flex h-full flex-col gap-6 p-8">
                  <Quote className="size-5" style={{ color: "var(--accent-glow)" }} />
                  <p className="flex-1 text-[15px] leading-relaxed font-light text-foreground/90">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                    {testimonial.link ? (
                      <a
                        href={testimonial.link}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="transition-colors hover:text-[var(--accent-glow)]"
                      >
                        {testimonial.name} — {testimonial.role}
                      </a>
                    ) : (
                      <span>
                        {testimonial.name} — {testimonial.role}
                      </span>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
