import { LockKeyhole } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

export function TrustSection() {
  return (
    <section
      id="trust"
      className="relative flex w-full items-center justify-center overflow-hidden border-t border-border/60 bg-background py-32 md:py-40"
    >
      <div
        aria-hidden
        className="landing-radial-drift pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at center, color-mix(in oklch, var(--accent-glow), transparent 94%) 0%, transparent 70%)",
        }}
      />

      <Reveal className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <div className="group relative mx-auto mb-10 flex size-20 items-center justify-center rounded-full bg-background shadow-[inset_0_0_0_1px_var(--border)] transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_var(--accent-glow)]">
          <div className="absolute inset-0 animate-[auth-pulse-slow_3s_ease-in-out_infinite] rounded-full" />
          <div
            className="absolute -inset-2 rounded-full border [animation:spin_4s_linear_infinite]"
            style={{ borderColor: "color-mix(in oklch, var(--accent-glow), transparent 70%)", borderTopColor: "var(--accent-glow)" }}
          />
          <LockKeyhole
            className="relative z-10 size-8 transition-transform duration-500 group-hover:scale-110"
            style={{ color: "var(--accent-glow)", filter: "drop-shadow(0 0 8px rgba(107,224,164,0.4))" }}
          />
        </div>

        <h2 className="mb-8 text-5xl leading-tight font-semibold tracking-tighter text-foreground md:text-7xl">
          Nothing posted
          <br />
          <span className="bg-gradient-to-r from-foreground/30 via-foreground/60 to-foreground/30 bg-clip-text text-transparent">
            without you.
          </span>
        </h2>

        <p className="mx-auto max-w-2xl text-xl leading-relaxed font-light text-muted-foreground md:text-2xl">
          Getrive drafts, it doesn&apos;t post. Automation ruins authenticity — you decide what goes out, every
          time, on Reddit, Hacker News, or anywhere else.
        </p>

        <div className="mt-16 inline-flex items-center gap-6 rounded-lg border border-border bg-background/80 px-8 py-5 font-mono text-[11px] tracking-widest text-foreground backdrop-blur-md">
          <span className="text-muted-foreground uppercase">Auto-reply systems</span>
          <span className="landing-toggle-track relative h-6 w-12 overflow-hidden rounded-full bg-secondary shadow-inner">
            <span className="landing-toggle-thumb absolute top-1 right-1 size-4 rounded-full bg-[var(--accent-glow)]" />
          </span>
          <span className="font-bold tracking-[0.2em] text-destructive uppercase drop-shadow-[0_0_4px_rgba(196,84,74,0.6)]">
            Disabled by design
          </span>
        </div>
      </Reveal>
    </section>
  );
}
