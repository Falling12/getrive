import { Check, SlidersHorizontal } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const INCLUDED = ["Reddit + Hacker News + IndieHackers monitoring", "AI relevance scoring", "Reply & outreach drafting", "Signup attribution"];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="relative w-full overflow-hidden border-t border-border/60 bg-background py-32 md:py-40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)" }}
      />

      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col items-center px-4 lg:px-8">
        <Reveal
          delayMs={0}
          className="landing-panel landing-price-pulse relative w-full max-w-2xl p-12 text-center shadow-[0_0_50px_rgba(107,224,164,0.1)] md:p-16"
        >
          <span className="landing-bracket absolute top-4 left-4 border-t-2 border-l-2" />
          <span className="landing-bracket absolute top-4 right-4 border-t-2 border-r-2" />
          <span className="landing-bracket absolute bottom-4 left-4 border-b-2 border-l-2" />
          <span className="landing-bracket absolute right-4 bottom-4 border-r-2 border-b-2" />

          <div
            className="mb-8 inline-flex size-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)",
              boxShadow: "inset 0 0 0 1px var(--accent-glow), 0 0 20px rgba(107,224,164,0.2)",
              color: "var(--accent-glow)",
            }}
          >
            <SlidersHorizontal className="size-6" />
          </div>

          <h2 className="mb-6 text-4xl font-semibold tracking-tighter text-foreground">Early access</h2>
          <p className="mx-auto mb-10 max-w-md text-lg leading-relaxed font-light text-muted-foreground">
            Free while Getrive is in early access — plus a direct line to the founder and a say in what gets built
            next.
          </p>

          <div className="mb-10 inline-block font-mono">
            <span className="text-7xl font-bold tracking-tighter text-foreground drop-shadow-[0_0_15px_rgba(234,231,224,0.3)]">
              $0
            </span>
            <span
              className="mt-4 block rounded-full border px-4 py-1.5 text-[11px] font-medium tracking-[0.2em] uppercase"
              style={{
                borderColor: "color-mix(in oklch, var(--accent-glow), transparent 70%)",
                backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)",
                color: "var(--accent-glow)",
              }}
            >
              Free during early access — early users keep preferred pricing later
            </span>
          </div>

          <div className="mx-auto mb-10 grid max-w-sm grid-cols-2 gap-4 text-left font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {INCLUDED.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 drop-shadow-[0_0_4px_var(--accent-glow)]" style={{ color: "var(--accent-glow)" }} />
                {item}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
