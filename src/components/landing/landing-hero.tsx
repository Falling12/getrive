"use client";

import Link from "next/link";
import { Ear } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InterceptDemo } from "@/components/landing/intercept-demo";
import { HeroSignalPreview } from "@/components/landing/hero-signal-preview";
import { track } from "@/lib/analytics/posthog-client";

// Mobile-first: PostHog showed 84% of traffic is mobile, ~14s avg time on
// page, and near-zero scroll past 25% depth — so this section is built and
// verified at a mobile viewport first (compact spacing, product preview
// visible without scrolling, one unmissable full-width CTA), then widened
// for lg+ back toward the prior two-column layout, not the reverse.
export function LandingHero() {
  return (
    <main className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pt-20 pb-10 lg:min-h-[100dvh] lg:flex-row lg:items-center lg:justify-center lg:gap-12 lg:px-8 lg:pt-32 lg:pb-20">
      <section className="flex w-full min-w-0 flex-col justify-center gap-3 lg:w-[46%] lg:gap-8">
        <h1
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] text-[2.25rem] leading-[1.05] font-semibold tracking-tight text-foreground opacity-0 md:text-6xl md:leading-[0.95] md:tracking-tighter lg:text-7xl xl:text-8xl"
          style={{ animationDelay: "0.05s" }}
        >
          See who&apos;s asking for{" "}
          <span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg, var(--accent-glow), #a7f3d0, var(--accent-glow))",
            }}
          >
            your product
          </span>{" "}
          right now.
        </h1>

        <p
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] max-w-md text-[15px] leading-relaxed font-light text-muted-foreground opacity-0 md:text-xl"
          style={{ animationDelay: "0.1s" }}
        >
          Getrive watches Reddit, Hacker News, and IndieHackers, flags high-intent posts, and drafts a reply. You
          review and hit send.
        </p>

        {/* Mobile-only: the real product visual, immediately visible without
            scrolling. Hidden at lg+ where InterceptDemo (below) has room. */}
        <div
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] opacity-0 lg:hidden"
          style={{ animationDelay: "0.15s" }}
        >
          <HeroSignalPreview />
        </div>

        <div
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] flex flex-col items-stretch gap-3 opacity-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4"
          style={{ animationDelay: "0.2s" }}
        >
          <Button
            render={<Link href="/signup" />}
            nativeButton={false}
            onClick={() => track("cta_clicked", { cta_id: "hero" })}
            className="landing-btn-glow h-auto w-full rounded-lg px-8 py-5 text-center font-mono text-sm font-semibold tracking-widest uppercase transition-transform active:translate-y-px lg:w-auto lg:py-4 lg:text-xs"
            style={{
              backgroundColor: "var(--accent-glow)",
              color: "var(--background)",
              boxShadow: "0 0 24px rgba(107,224,164,0.4)",
            }}
          >
            Show me who&apos;s asking — free
          </Button>
          <a
            href="#how-it-works"
            className="landing-btn-glow flex items-center justify-center gap-2 rounded-lg bg-background/50 px-8 py-3 font-mono text-xs tracking-widest text-muted-foreground uppercase shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:text-[var(--accent-glow)] lg:justify-start lg:py-4 lg:text-foreground"
          >
            See how it works
          </a>
        </div>

        <div
          className="animate-[auth-enter_0.8s_cubic-bezier(0.175,0.885,0.32,1)_forwards] flex flex-col gap-1.5 opacity-0"
          style={{ animationDelay: "0.25s" }}
        >
          <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-muted-foreground/60 uppercase lg:text-[10px]">
            <span className="size-1.5 animate-[auth-pulse-slow_3s_ease-in-out_infinite] rounded-full" style={{ backgroundColor: "var(--accent-glow)" }} />
            Nothing posts without you reviewing it first
          </div>
          <p className="pl-3.5 text-[13px] font-light text-muted-foreground/80 lg:text-sm">
            Getrive found its own first users this exact way.
          </p>
        </div>
      </section>

      <section
        className="hidden w-full min-w-0 justify-center lg:flex lg:w-[54%] lg:justify-end"
        style={{ animation: "auth-enter 0.8s cubic-bezier(0.175,0.885,0.32,1) 0.15s forwards", opacity: 0 }}
      >
        <InterceptDemo />
      </section>
    </main>
  );
}
