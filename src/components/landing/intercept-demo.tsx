"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { formatSourceLabel } from "@/lib/sources/format";

// Illustrative, not fabricated — every scenario is the same shape of post
// real founders quote in Positioning ("I don't even know where my users
// hang out online," "just trying to get to my first 10 paying customers"),
// and every drafted reply follows generateReply's own real constraints
// (lib/ai/reply-generation.ts): lead with genuine help, one brief, low-key
// product mention near the end, never the main point. Only Reddit and
// Hacker News appear — Twitter/X isn't live yet, so it isn't shown as if it
// already is.
interface Scenario {
  sourceType: "REDDIT_SUBREDDIT" | "HACKERNEWS";
  sourceName: string;
  post: string;
  highlights: string[];
  intent: string;
  detail: string;
  reply: string;
}

const SCENARIOS: Scenario[] = [
  {
    sourceType: "REDDIT_SUBREDDIT",
    sourceName: "SaaS",
    post: "I can build the product, that part I'm fine with. But I have no idea where my actual users hang out online, and cold-DMing strangers makes my skin crawl. How is everyone finding their first 10 customers?",
    highlights: ["no idea where my actual users hang out", "cold-DMing strangers makes my skin crawl"],
    intent: "HIGH",
    detail: "DISTRIBUTION",
    reply: "Same spot when I launched — the DMs felt gross and I didn't have a following to post to either. What actually worked: finding people already describing this exact problem in public and just replying like a person, not a pitch. I got tired of doing that search by hand so I built Getrive to surface those posts automatically. No pressure, just figured it's worth mentioning since this is almost word-for-word what it looks for.",
  },
  {
    sourceType: "HACKERNEWS",
    sourceName: "Ask HN",
    post: "Ask HN: bootstrapped founders — how are you getting your first real customers without an audience, an ad budget, or a sales background?",
    highlights: ["without an audience, an ad budget, or a sales background"],
    intent: "CRITICAL",
    detail: "COLD START",
    reply: "The honest answer for me was: the people who need what you built are already complaining about the problem somewhere public, you just have to actually go find the thread and reply for real. Manually that's a part-time job, so I ended up building Getrive to do the finding part — it watches Reddit and HN for exactly this kind of post and drafts a reply, but you always review and send it yourself.",
  },
  {
    sourceType: "REDDIT_SUBREDDIT",
    sourceName: "startups",
    post: "Spent all weekend on a landing page and a Product Hunt launch. Got 40 upvotes, zero signups that actually stuck around. I don't think I even know who my users are supposed to be.",
    highlights: ["zero signups that actually stuck around", "don't think I even know who my users are supposed to be"],
    intent: "HIGH",
    detail: "POST-LAUNCH",
    reply: "A launch day spike that doesn't stick is almost always an audience problem, not a product one — the upvotes aren't the same people who'd actually use it. What helped me was going the other way: find the specific people already describing the problem, in their own words, and start there instead of a big broadcast. That's basically what I built Getrive to do, if it's useful to see how it finds those threads.",
  },
];

const TYPE_INTERVAL_MS = 12;
const AWAIT_MS = 1200;
const SCAN_START_MS = 800;
const SCAN_DURATION_MS = 700;
const METRICS_MS = 1000;
const DRAFT_OPEN_MS = 600;
const HOLD_MS = 7000;

type Phase = "idle" | "intercepting" | "scanning" | "analyzed" | "drafting" | "typing" | "ready";

const STATUS_LABEL: Record<Phase, string> = {
  idle: "Awaiting signal…",
  intercepting: "Intercepting stream…",
  scanning: "Semantic analysis…",
  analyzed: "Semantic analysis…",
  drafting: "Synthesizing draft…",
  typing: "Synthesizing draft…",
  ready: "Operator action required",
};

export function InterceptDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typedReply, setTypedReply] = useState("");
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const scenario = SCENARIOS[scenarioIndex];
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) => {
      timeouts.push(setTimeout(() => !cancelled && fn(), ms));
    };

    if (reduceMotionRef.current) {
      setPhase("ready");
      setTypedReply(scenario.reply);
      after(HOLD_MS * 2, () => setScenarioIndex((i) => (i + 1) % SCENARIOS.length));
      return () => {
        cancelled = true;
        timeouts.forEach(clearTimeout);
      };
    }

    setPhase("idle");
    setTypedReply("");
    after(AWAIT_MS, () => setPhase("intercepting"));
    after(AWAIT_MS + SCAN_START_MS, () => setPhase("scanning"));
    after(AWAIT_MS + SCAN_START_MS + SCAN_DURATION_MS, () => setPhase("analyzed"));
    after(AWAIT_MS + SCAN_START_MS + SCAN_DURATION_MS + METRICS_MS, () => setPhase("drafting"));
    after(AWAIT_MS + SCAN_START_MS + SCAN_DURATION_MS + METRICS_MS + DRAFT_OPEN_MS, () => setPhase("typing"));

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [scenarioIndex]);

  useEffect(() => {
    if (phase !== "typing") return;
    const scenario = SCENARIOS[scenarioIndex];
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setTypedReply(scenario.reply.slice(0, i));
      if (i >= scenario.reply.length) {
        clearInterval(interval);
        setPhase("ready");
        setTimeout(() => setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length), HOLD_MS);
      }
    }, TYPE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [phase, scenarioIndex]);

  const scenario = SCENARIOS[scenarioIndex];
  const showPost = phase !== "idle";
  const showHighlights = phase === "analyzed" || phase === "drafting" || phase === "typing" || phase === "ready";
  const showDraft = phase === "drafting" || phase === "typing" || phase === "ready";
  const isLive = phase !== "idle" && phase !== "ready";

  return (
    <div className="relative w-full min-w-0 max-w-2xl">
      <div className="absolute -top-10 left-10 hidden h-20 w-px bg-gradient-to-b from-transparent to-[var(--accent-glow)]/50 md:block" />
      <div className="absolute top-1/2 -right-6 hidden h-px w-20 bg-gradient-to-r from-[var(--accent-glow)]/50 to-transparent md:block" />

      <div className="relative flex min-h-[480px] w-full flex-col overflow-hidden rounded-xl border border-border/50 bg-background/70 shadow-[0_20px_40px_-15px_rgba(107,224,164,0.1)] backdrop-blur-md">
        <div className="z-20 flex h-12 items-center justify-between border-b border-[color-mix(in_oklch,var(--accent),transparent_90%)] bg-background/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-glow)] opacity-75" />
              )}
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{
                  backgroundColor: phase === "ready" ? "var(--foreground)" : isLive ? "var(--accent-glow)" : "var(--border)",
                  boxShadow: isLive || phase === "ready" ? "0 0 10px var(--accent-glow)" : undefined,
                }}
              />
            </span>
            <span
              className="font-medium tracking-widest uppercase transition-colors"
              style={{ color: phase === "ready" ? "var(--foreground)" : isLive ? "var(--accent-glow)" : "var(--muted-foreground)" }}
            >
              {STATUS_LABEL[phase]}
            </span>
          </div>

          <div className={`flex h-4 items-end gap-1 transition-opacity ${isLive ? "opacity-100" : "opacity-30"}`}>
            {[1, 0.66, 0.5, 1].map((h, i) => (
              <div
                key={i}
                className="w-1 animate-pulse rounded-[1px]"
                style={{
                  height: `${h * 100}%`,
                  backgroundColor: isLive ? "var(--accent-glow)" : "var(--foreground)",
                  animationDuration: `${0.8 + i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-start bg-background/40 p-8">
          {phase === "scanning" && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 animate-[landing-scan-sweep_1.5s_cubic-bezier(0.25,1,0.5,1)_forwards] border-b-2 border-[var(--accent-glow)] bg-gradient-to-b from-[color-mix(in_oklch,var(--accent-glow),transparent_100%)] via-[color-mix(in_oklch,var(--accent-glow),transparent_80%)] to-[color-mix(in_oklch,var(--accent-glow),transparent_20%)] shadow-[0_10px_20px_rgba(107,224,164,0.2)]"
            />
          )}

          {showPost && (
            <div
              key={scenarioIndex}
              className="animate-[auth-fade-in_0.5s_ease-out_forwards]"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-secondary/50 shadow-[inset_0_0_0_1px_var(--border)]">
                  <Send className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex gap-3 font-mono text-[11px] text-muted-foreground uppercase">
                  <span style={{ color: "var(--accent-glow)" }}>
                    {formatSourceLabel(scenario.sourceType, scenario.sourceName)}
                  </span>
                  <span className="text-border">/</span>
                  <span className="opacity-70">Live stream</span>
                </div>
              </div>

              <p className="text-[16px] leading-relaxed font-light text-foreground/90">
                <HighlightedText text={scenario.post} highlights={scenario.highlights} active={showHighlights} />
              </p>

              {showHighlights && (
                <div className="mt-5 flex flex-wrap gap-2 opacity-0 [animation:auth-fade-in_0.3s_ease-out_forwards]">
                  <span
                    className="rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest"
                    style={{
                      borderColor: "color-mix(in oklch, var(--accent-glow), transparent 50%)",
                      backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 80%)",
                      color: "var(--accent-glow)",
                    }}
                  >
                    INTENT: {scenario.intent}
                  </span>
                  <span className="rounded-lg border border-border/50 bg-background px-3 py-1.5 font-mono text-[10px] text-muted-foreground tracking-widest">
                    {scenario.detail}
                  </span>
                </div>
              )}
            </div>
          )}

          {showDraft && (
            <div className="relative mt-8 animate-[auth-fade-in_0.4s_ease-out_forwards]">
              <div className="absolute top-0 left-4 h-full w-px bg-border">
                <div
                  className="h-1/3 w-full animate-[landing-float_6s_ease-in-out_infinite] bg-gradient-to-b from-transparent to-transparent"
                  style={{ backgroundImage: "linear-gradient(to bottom, transparent, var(--accent-glow), transparent)" }}
                />
              </div>

              <div className="pl-10">
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="font-mono text-[10px] tracking-widest uppercase"
                    style={{ color: "var(--accent-glow)" }}
                  >
                    Draft synthesized
                  </span>
                  <span
                    className="rounded px-2 py-1 font-mono text-[9px]"
                    style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)", color: "var(--foreground)" }}
                  >
                    not sent — draft only
                  </span>
                </div>

                <div
                  className="relative rounded-lg border-l-2 bg-background/90 p-5 text-[15px] leading-relaxed font-light text-foreground shadow-[inset_0_0_0_1px_var(--border)] backdrop-blur"
                  style={{ borderLeftColor: "var(--accent-glow)" }}
                >
                  {typedReply}
                  {phase === "typing" && (
                    <span
                      className="ml-1.5 inline-block h-[1.1em] w-[8px] translate-y-[2px] animate-[landing-cursor-blink_0.8s_step-end_infinite]"
                      style={{ backgroundColor: "var(--accent-glow)", boxShadow: "0 0 8px var(--accent-glow)" }}
                    />
                  )}
                </div>

                {phase === "ready" && (
                  <div className="mt-5 flex animate-[auth-fade-in_0.4s_ease-out_forwards] gap-4">
                    <button
                      className="landing-btn-glow flex flex-1 items-center justify-center gap-2 rounded-lg py-3.5 font-mono text-[11px] font-semibold tracking-widest uppercase transition-transform active:translate-y-px"
                      style={{ backgroundColor: "var(--accent-glow)", color: "var(--background)" }}
                    >
                      <Send className="size-3.5" /> Approve &amp; send
                    </button>
                    <button className="landing-btn-glow rounded-lg px-6 font-mono text-[11px] font-semibold tracking-widest text-foreground uppercase shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:text-[var(--accent-glow)]">
                      Edit text
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightedText({
  text,
  highlights,
  active,
}: {
  text: string;
  highlights: string[];
  active: boolean;
}) {
  if (!active || highlights.length === 0) return <>{text}</>;

  let remaining = text;
  const parts: React.ReactNode[] = [];
  highlights.forEach((phrase, index) => {
    const splitIndex = remaining.indexOf(phrase);
    if (splitIndex === -1) return;
    parts.push(remaining.slice(0, splitIndex));
    parts.push(
      <span
        key={index}
        className="rounded px-1.5 font-semibold transition-colors duration-300"
        style={{
          backgroundColor: "var(--accent-glow)",
          color: "var(--background)",
          boxShadow: "0 0 12px rgba(107,224,164,0.4)",
        }}
      >
        {phrase}
      </span>
    );
    remaining = remaining.slice(splitIndex + phrase.length);
  });
  parts.push(remaining);

  return <>{parts}</>;
}
