import { Send, Gauge } from "lucide-react";

// Mobile hero's "aha" visual — a compact, non-animated recreation of the
// real Signal Detail flow (post + Getrive's drafted reply), styled with the
// exact classes/tokens SignalCard and ReplyEditor use in the actual product
// rather than InterceptDemo's stylized terminal treatment. Renders fully in
// the first paint (no multi-second phase sequence like InterceptDemo) since
// mobile visitors bounce in ~14s and this needs to read instantly. Same
// illustrative-not-fabricated scenario as InterceptDemo's first card (see
// intercept-demo.tsx) — kept in sync manually since this version is
// hand-trimmed for a ~300px mobile card instead of a 480px desktop one.
const POST = "I can build the product. But I have no idea where my actual users hang out online, and cold-DMing strangers makes my skin crawl.";
const HIGHLIGHT = "no idea where my actual users hang out";
const REPLY =
  "Been there. What actually worked for me: search Reddit/HN for people describing the problem in their own words, and reply with real help before ever mentioning what you're building. Slower than blasting DMs, but every convo actually converts. Happy to share how I structure the searches if useful.";

export function HeroSignalPreview() {
  const highlightIndex = POST.indexOf(HIGHLIGHT);
  const before = POST.slice(0, highlightIndex);
  const after = POST.slice(highlightIndex + HIGHLIGHT.length);

  return (
    <div className="w-full overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--border)] backdrop-blur-md bg-background/80">
      <div className="flex items-center justify-between border-b border-border/50 bg-background/90 px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          <span className="relative flex size-1.5">
            <span
              className="absolute inline-flex size-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: "var(--accent-glow)" }}
            />
            <span className="relative inline-flex size-1.5 rounded-full" style={{ backgroundColor: "var(--accent-glow)" }} />
          </span>
          r/SaaS
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/60">2m ago</span>
      </div>

      <div className="px-4 pt-4 pb-3">
        <p className="text-[13px] leading-relaxed font-light text-foreground/90">
          {before}
          <span
            className="rounded px-1 font-medium"
            style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 78%)", color: "var(--accent-glow)" }}
          >
            {HIGHLIGHT}
          </span>
          {after}
        </p>
        <div
          className="mt-2.5 flex w-max items-center gap-1.5 rounded px-2 py-1"
          style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 88%)" }}
        >
          <Gauge className="size-3" style={{ color: "var(--accent-glow)" }} />
          <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: "var(--accent-glow)" }}>
            Relevance: 94%
          </span>
        </div>
      </div>

      <div className="border-t border-border/50 bg-background/60 px-4 pt-3 pb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[9px] font-medium tracking-widest uppercase" style={{ color: "var(--accent-glow)" }}>
            Getrive AI draft
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[8px] text-foreground"
            style={{ backgroundColor: "color-mix(in oklch, var(--accent-glow), transparent 90%)" }}
          >
            not sent
          </span>
        </div>
        <p
          className="line-clamp-3 rounded-lg border-l-2 bg-background/90 p-3 text-[12.5px] leading-relaxed font-light text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
          style={{ borderLeftColor: "var(--accent-glow)" }}
        >
          {REPLY}
        </p>
        <div
          className="mt-3 flex items-center justify-center gap-2 rounded-lg py-2.5 font-mono text-[10px] font-semibold tracking-widest uppercase"
          style={{ backgroundColor: "var(--accent-glow)", color: "var(--background)" }}
        >
          <Send className="size-3" /> Approve &amp; send
        </div>
      </div>
    </div>
  );
}
