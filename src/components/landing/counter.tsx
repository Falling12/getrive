"use client";

import { useEffect, useRef, useState } from "react";

// Counts up from 0 to `target` once scrolled into view — used for the
// handful of real, honestly-labeled numbers on the page (e.g. the pricing
// section's $0). Deliberately not reused for anything we can't actually
// back with a real number (no fake user/queue counts).
export function Counter({
  target,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  target: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setValue(target);
          return;
        }
        const steps = 40;
        const increment = target / steps;
        let current = 0;
        const interval = setInterval(() => {
          current += increment;
          if (current >= target) {
            setValue(target);
            clearInterval(interval);
          } else {
            setValue(current);
          }
        }, 30);
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {prefix}
      {decimals > 0 ? value.toFixed(decimals) : Math.round(value)}
      {suffix}
    </span>
  );
}
