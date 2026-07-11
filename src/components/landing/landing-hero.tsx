"use client";

import Link from "next/link";
import { ArrowDownRight, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InterceptDemo } from "@/components/landing/intercept-demo";
import { track } from "@/lib/analytics/posthog-client";

export function LandingHero() {
  return (
    <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1400px] flex-col justify-center gap-12 px-4 pt-32 pb-20 lg:flex-row lg:items-center lg:px-8 lg:pt-40">
      <section className="flex w-full min-w-0 flex-col justify-center gap-8 lg:w-[46%]">
        <div className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] inline-flex w-max items-center gap-3 rounded-lg border border-[color-mix(in_oklch,var(--accent),transparent_80%)] bg-background/80 px-4 py-2 opacity-0 backdrop-blur-sm">
          <Crosshair
            className="size-4 animate-[auth-pulse-slow_4s_linear_infinite] [animation-name:spin] [animation-duration:8s]"
            style={{ color: "var(--accent-glow)", filter: "drop-shadow(0 0 8px var(--accent-glow))" }}
          />
          <span className="font-mono text-[10px] font-medium tracking-widest uppercase" style={{ color: "var(--accent-glow)" }}>
            Target acquisition engine online
          </span>
        </div>

        <h1
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] text-5xl leading-[0.95] font-semibold tracking-tighter text-foreground opacity-0 md:text-7xl lg:text-8xl"
          style={{ animationDelay: "0.05s" }}
        >
          Stop pitching.
          <br />
          <span
            className="mt-2 inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg, var(--accent-glow), #a7f3d0, var(--accent-glow))",
            }}
          >
            Start intercepting.
          </span>
        </h1>

        <p
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] max-w-md text-lg leading-relaxed font-light text-muted-foreground opacity-0 md:text-xl"
          style={{ animationDelay: "0.1s" }}
        >
          Founders broadcast into the void while their perfect users complain on Reddit and Hacker News. Getrive
          detects real pain-points the moment they&apos;re posted and drafts your reply.
        </p>

        <div
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] flex flex-wrap items-center gap-4 opacity-0"
          style={{ animationDelay: "0.2s" }}
        >
          <Button
            render={<Link href="/signup" />}
            nativeButton={false}
            onClick={() => track("cta_clicked", { cta_id: "hero" })}
            className="landing-btn-glow h-auto rounded-lg px-8 py-4 font-mono text-xs font-semibold tracking-widest uppercase transition-transform active:translate-y-px"
            style={{
              backgroundColor: "var(--accent-glow)",
              color: "var(--background)",
              boxShadow: "0 0 20px rgba(107,224,164,0.3)",
            }}
          >
            Deploy instrument
          </Button>
          <a
            href="#how-it-works"
            className="landing-btn-glow flex items-center gap-2 rounded-lg bg-background/50 px-8 py-4 font-mono text-xs tracking-widest text-foreground uppercase shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:text-[var(--accent-glow)]"
          >
            View architecture <ArrowDownRight className="size-3.5" />
          </a>
        </div>

        <div
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground/60 uppercase opacity-0"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="size-1.5 animate-[auth-pulse-slow_3s_ease-in-out_infinite] rounded-full" style={{ backgroundColor: "var(--accent-glow)" }} />
          Nothing posts without you reviewing it first
        </div>
      </section>

      <section
        className="flex w-full min-w-0 justify-center lg:w-[54%] lg:justify-end"
        style={{ animation: "auth-enter 0.8s cubic-bezier(0.175,0.885,0.32,1) 0.15s forwards", opacity: 0 }}
      >
        <InterceptDemo />
      </section>
    </main>
  );
}
