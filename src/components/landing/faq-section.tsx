import { CircleHelp } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { FAQS } from "@/lib/faq";

// Static (not an accordion) — every answer stays in the initial HTML
// instead of behind a client-side expand/collapse, so it's readable by any
// crawler that doesn't execute JS. This also doubles as the visible
// counterpart to the FAQPage JSON-LD in app/page.tsx (both read from the
// same FAQS array), which matters because structured data is expected to
// reflect what's actually on the page, not just live in a hidden script tag.
export function FaqSection() {
  return (
    <section id="faq" className="relative w-full border-t border-border/60 py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <Reveal className="mb-16 flex flex-col items-center gap-4 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] font-medium tracking-widest uppercase"
            style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)", color: "var(--accent-glow)" }}
          >
            <CircleHelp className="size-3.5" />
            Common questions
          </span>
          <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Before you ask.
          </h2>
        </Reveal>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          {FAQS.map((faq, index) => (
            <Reveal key={faq.question} delayMs={100 * (index % 2)}>
              <div className="landing-panel h-full p-8">
                <h3 className="mb-3 text-lg font-semibold text-foreground">{faq.question}</h3>
                <p className="text-[15px] leading-relaxed font-light text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
