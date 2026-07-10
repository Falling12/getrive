"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Scroll-triggered entrance for every section after the hero — each
// instance observes itself and fires once, matching the landing page's
// IntersectionObserver-driven design (see .landing-reveal in globals.css).
// The hero's own entrance uses the page-load auth-enter animation instead
// (see landing-hero.tsx), since it's visible immediately on load.
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced-motion handling lives in CSS (see the prefers-reduced-motion
    // block in globals.css, which snaps .landing-reveal to its visible state
    // instantly instead of animating) rather than branching here — that
    // keeps this effect to a single async setState path instead of also
    // setState-ing synchronously in the effect body for the reduced-motion
    // case.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("landing-reveal", visible && "landing-reveal-visible", className)}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
