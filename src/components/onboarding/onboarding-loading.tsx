"use client";

import { useEffect, useState } from "react";

const LOG_LINES = [
  "Reading product description…",
  "Reasoning about who feels this pain…",
  "Comparing channel fit…",
  "Checking access friction…",
  "Ranking the first source plan…",
];

export function OnboardingLoading() {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (lineIndex >= LOG_LINES.length - 1) return;
    const timeout = setTimeout(() => setLineIndex((index) => index + 1), 1100);
    return () => clearTimeout(timeout);
  }, [lineIndex]);

  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center">
      <div className="relative mb-8 size-20">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-1.5 animate-pulse rounded-full bg-foreground" />
        </div>
      </div>
      <p className="font-mono text-[11px] tracking-widest text-accent uppercase">
        {LOG_LINES[lineIndex]}
      </p>
    </div>
  );
}
