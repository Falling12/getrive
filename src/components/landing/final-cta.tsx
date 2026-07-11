"use client";

import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/posthog-client";

export function FinalCta() {
  return (
    <section
      id="cta"
      className="relative w-full overflow-hidden border-t border-border/60 bg-gradient-to-t from-[color-mix(in_oklch,var(--accent-glow),var(--background)_92%)] to-background py-32 md:py-40"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] opacity-60 [animation:spin_12s_linear_infinite]"
          style={{
            backgroundImage:
              "conic-gradient(from 90deg at 50% 50%, var(--background) 0%, var(--background) 40%, color-mix(in oklch, var(--accent-glow), transparent 85%) 50%, var(--background) 60%, var(--background) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[80px]" />
      </div>

      <Reveal className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <h2 className="mb-8 text-6xl leading-[0.9] font-bold tracking-tighter text-foreground md:text-8xl">
          Start listening today.
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed font-light text-muted-foreground md:text-2xl">
          Stop broadcasting into the void. Start answering the people already asking for exactly this.
        </p>

        <Button
          render={<Link href="/signup" />}
          nativeButton={false}
          onClick={() => track("cta_clicked", { cta_id: "final_cta" })}
          className="landing-ripple-hover h-auto animate-[pulse-fast_2s_infinite] rounded-lg px-12 py-6 font-mono text-sm font-bold tracking-[0.2em] uppercase transition-all"
          style={{
            backgroundColor: "var(--accent-glow)",
            color: "var(--background)",
            boxShadow: "0 0 40px rgba(107,224,164,0.4)",
          }}
        >
          Start listening — it&apos;s free
        </Button>
        <p className="mt-8 font-mono text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">
          No card required
        </p>
      </Reveal>
    </section>
  );
}
