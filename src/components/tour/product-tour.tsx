"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
  // Segment appended to /projects/[projectId] — advancing to a step on a
  // different segment triggers a real navigation before it can highlight
  // anything, so the tour walks the actual product instead of just the
  // dashboard.
  segment: "dashboard" | "signals" | "sources";
  target: string;
  title: string;
  description: string;
}

// Targets are `data-tour` attributes on the pages themselves (dashboard,
// signals, sources) and on both nav implementations (app-sidebar.tsx desktop,
// mobile-bottom-nav.tsx mobile) — plain DOM selectors rather than refs, since
// this component looks elements up by querySelector regardless of which
// component rendered them or which viewport is active.
const STEPS: TourStep[] = [
  {
    segment: "dashboard",
    target: '[data-tour="metric"]',
    title: "Your one number",
    description: "Users acquired through Getrive. Everything else on this page exists to move this number.",
  },
  {
    segment: "dashboard",
    target: '[data-tour="stats"]',
    title: "This week at a glance",
    description: "Signals caught, replies sent, and Reddit karma tracked across everything you're monitoring.",
  },
  {
    segment: "dashboard",
    target: '[data-tour="needs-attention"]',
    title: "Needs attention",
    description: "New signals to reply to, and anything else that needs a look, always surface here first.",
  },
  {
    segment: "dashboard",
    target: '[data-tour="nav-signals"]',
    title: "Signals",
    description: "Pain-point posts Getrive found, each with a drafted reply waiting for you. Let's take a look.",
  },
  {
    segment: "signals",
    target: '[data-tour="signal-list"]',
    title: "Review & reply",
    description: "Every post here has a drafted reply ready — open one, tweak it, and send it in a couple clicks.",
  },
  {
    segment: "signals",
    target: '[data-tour="nav-sources"]',
    title: "Sources",
    description: "The channels behind those signals. Let's see how they're managed.",
  },
  {
    segment: "sources",
    target: '[data-tour="add-source"]',
    title: "Add a source",
    description: "Add more channels anytime — everything here is fetched automatically, no manual setup required.",
  },
  {
    segment: "sources",
    target: '[data-tour="source-list"]',
    title: "Your channel mix",
    description: "Hacker News is broad and immediate; Reddit is community-specific — mind each subreddit's self-promo rules.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const HIGHLIGHT_PADDING = 10;
const POPOVER_WIDTH = 340;
const POPOVER_MARGIN = 16;
const POPOVER_GAP = 14;
// The popover's real height depends on its (short, bounded) copy and isn't
// known until after it paints, so this is a deliberately generous estimate
// used only to keep the "place above the target" branch from computing a
// `top` that lands above y=0 — a target near the 200px placeBelow threshold
// combined with a taller-than-expected popover was landing off the top of
// the viewport.
const POPOVER_EST_HEIGHT = 260;
// Once we're actually on the right page (isPending has resolved — see
// below), the target should already be in the committed DOM; this only
// covers the trailing layout-settle frame. Genuinely-missing targets (e.g. a
// nav step whose sidebar is `hidden` at the current viewport) still get
// caught and skipped after this short budget — it's not covering
// navigation/compile time anymore, so it can stay small.
const MAX_MEASURE_RETRIES = 20;

// Elements with `display:none` (Tailwind `hidden`) always have a null
// offsetParent, so this filters out e.g. the desktop sidebar's copy of a
// nav-tour target on mobile, where only the bottom tab bar's copy is visible.
function queryVisible(selector: string): HTMLElement | null {
  const matches = document.querySelectorAll<HTMLElement>(selector);
  for (const el of matches) {
    if (el.offsetParent !== null) return el;
  }
  return matches[0] ?? null;
}

export function ProductTour() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = useTransition();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const retriesRef = useRef(0);

  // This component lives in the project layout and persists across
  // dashboard/signals/sources navigation, so it only mounts once per project
  // visit — `?tour=1` has to be handled reactively here (not as an initial
  // state snapshot) to also support the Settings page's "Retake tour" link,
  // which navigates to this same URL shape on an already-mounted instance.
  // Reacting to the URL (an external system) is the documented case for
  // setState-in-effect. Immediately stripped so a refresh never replays it.
  useEffect(() => {
    if (searchParams.get("tour") !== "1") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
    setStepIndex(0);
    router.replace(pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;

  // Holds the latest `measure` so its own requestAnimationFrame retry can
  // call back into it without referencing the useCallback result before it's
  // declared (measure recreates on every stepIndex change; the ref always
  // points at the current one).
  const measureRef = useRef<(scrollTo: boolean) => void>(() => {});

  // `scrollTo` is true only for the initial measure right after arriving at
  // a step, never for the resize/scroll listeners below — calling
  // scrollIntoView() from a scroll-event handler re-triggers more scroll
  // events (including the ones its own smooth-scroll animation generates),
  // fighting the animation and occasionally settling on a wildly wrong
  // position (e.g. the popover ending up off the top of the viewport).
  const measure = useCallback((scrollTo: boolean) => {
    const el = queryVisible(STEPS[stepIndex].target);
    if (el) {
      retriesRef.current = 0;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      if (scrollTo) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Not found yet — either the target page is still rendering after a
    // navigation, or (for nav-step targets) this viewport hides it. Retry a
    // bounded number of times before concluding it's the latter and moving on.
    if (retriesRef.current < MAX_MEASURE_RETRIES) {
      retriesRef.current += 1;
      requestAnimationFrame(() => measureRef.current(scrollTo));
      return;
    }
    retriesRef.current = 0;
    setStepIndex((current) => (current < STEPS.length - 1 ? current + 1 : current));
  }, [stepIndex]);
  useEffect(() => {
    measureRef.current = measure;
  }, [measure]);

  // Navigate to the step's segment first when it differs from the current
  // page, then measure once we're actually there. Runs for every step
  // change, pathname change, and isNavigating change, so it re-fires once
  // the push above actually lands.
  //
  // router.push is wrapped in startTransition specifically so isNavigating
  // stays true for the FULL navigation — including a dev-mode cold compile
  // of a route not yet visited this session, which can take several seconds
  // (observed: an uncompiled route took 6s+ on first hit). Without this, an
  // earlier version used a fixed ~750ms requestAnimationFrame retry budget
  // to wait out the navigation, which was consistently shorter than a cold
  // compile — measure() gave up and skipped the step before the destination
  // page had even rendered, which looked like the tour popover vanishing
  // right after clicking "Next" into Signals.
  useEffect(() => {
    if (!active || !projectId) return;
    const targetPath = `/projects/${projectId}/${STEPS[stepIndex].segment}`;
    if (pathname !== targetPath) {
      startNavigation(() => router.push(targetPath, { scroll: false }));
      return;
    }
    if (isNavigating) return;
    retriesRef.current = 0;
    // measure() sets state from getBoundingClientRect(), which only exists
    // once the target is committed to the DOM — this is React's own
    // documented valid use of an effect (there's no way to read live layout
    // during render), so the lint rule's general "avoid setState in
    // effects" heuristic doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure(true);
  }, [active, stepIndex, pathname, projectId, router, measure, isNavigating]);

  useEffect(() => {
    if (!active) return;
    const handleReflow = () => measure(false);
    // Capture-phase so scroll on a page's own scroll container (not just
    // `window`) is caught too — plain scroll events don't bubble.
    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);
    return () => {
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [active, measure]);

  if (!active || !rect) return null;

  // `.theme-getrive` (AppLayout) is where every brand CSS variable — colors,
  // fonts — is actually defined; it's a scoped class, not :root, so a plain
  // `document.body` portal target would render this outside the dark theme
  // entirely. Portaling into that element instead of body keeps the
  // variables while still escaping <main>'s z-10 stacking context (see the
  // comment below).
  const portalTarget = document.querySelector(".theme-getrive") ?? document.body;

  const step = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const finish = () => setActive(false);

  const highlightStyle: CSSProperties = {
    position: "fixed",
    top: rect.top - HIGHLIGHT_PADDING,
    left: rect.left - HIGHLIGHT_PADDING,
    width: rect.width + HIGHLIGHT_PADDING * 2,
    height: rect.height + HIGHLIGHT_PADDING * 2,
    borderRadius: 10,
    boxShadow: "0 0 0 9999px rgba(10,18,17,0.8), 0 0 0 1.5px var(--accent)",
    zIndex: 101,
    transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
  };

  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const placeBelow = spaceBelow > 200 || rect.top < 200;
  const popoverLeft = Math.min(
    Math.max(rect.left, POPOVER_MARGIN),
    window.innerWidth - POPOVER_WIDTH - POPOVER_MARGIN
  );
  const rawTop = placeBelow
    ? rect.top + rect.height + HIGHLIGHT_PADDING + POPOVER_GAP
    : rect.top - HIGHLIGHT_PADDING - POPOVER_GAP - POPOVER_EST_HEIGHT;
  // Always resolved to a `top`, then clamped into the viewport — using
  // `bottom` for the "place above" branch previously left the popover's
  // actual height out of the calculation entirely, so it could land with its
  // own top edge above y=0.
  const popoverTop = Math.min(
    Math.max(rawTop, POPOVER_MARGIN),
    window.innerHeight - POPOVER_MARGIN - POPOVER_EST_HEIGHT
  );
  const popoverStyle: CSSProperties = {
    left: popoverLeft,
    top: popoverTop,
    width: POPOVER_WIDTH,
  };

  // This component renders inside <main>, which the project layout gives
  // `relative z-10` — that makes <main> its own stacking context, so a
  // merely-high z-index here would still lose to AppSidebar's z-40 (a
  // sibling of <main>, not a descendant). Portaling escapes that context so
  // the overlay's own z-index is what actually gets compared.
  return createPortal(
    <>
      <div aria-hidden style={highlightStyle} className="pointer-events-none" />
      <div aria-hidden className="fixed inset-0 z-[100]" onClick={finish} />
      <div className="fixed z-[102]" style={popoverStyle}>
        <div className="flex flex-col gap-4 rounded-xl bg-background p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)] ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={`${s.segment}-${s.target}`}
                  className={cn("size-1.5 rounded-full transition-colors", i === stepIndex ? "bg-accent" : "bg-border")}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={finish}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Skip tour"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium tracking-widest text-accent uppercase">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
            <h4 className="text-base font-medium text-foreground">{step.title}</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>

          <div className="flex items-center justify-between">
            {!isFirst ? (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <Button
              onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
              className="gap-1.5 rounded-md font-mono text-[11px] tracking-wider uppercase"
            >
              {isLast ? "Done" : "Next"}
              {!isLast && <ArrowRight className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    portalTarget
  );
}
