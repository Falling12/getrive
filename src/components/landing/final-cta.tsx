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
          className="landing-btn-glow h-auto rounded-lg px-12 py-6 font-mono text-sm font-bold tracking-[0.2em] uppercase transition-transform active:translate-y-px"
          style={{
            backgroundColor: "var(--accent-glow)",
            color: "var(--background)",
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
