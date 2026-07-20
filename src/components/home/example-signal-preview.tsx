import { Target, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Only rendered while "Users acquired through Getrive" is still 0 — once a
// founder has real activity, their own signals speak for themselves and
// this mock would just be noise. Purely illustrative: no real IDs, no
// interactive reply/dismiss affordances, nothing that could be mistaken
// for an actual signal if skimmed quickly.
export function ExampleSignalPreview() {
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="flex items-center gap-2 text-xl font-medium text-foreground">
          What success looks like
        </h3>
        <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 font-mono text-[10px] tracking-widest text-accent uppercase">
          <Sparkles className="size-3" />
          Example
        </span>
      </header>

      <p className="max-w-2xl font-mono text-[11px] leading-relaxed text-muted-foreground">
        Once Getrive finds a real pain-point post, it looks like this — a scored signal with a
        drafted reply ready for you to review and send. Reply, get a signup, and it shows up in
        the number above.
      </p>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -m-1 rounded-xl border border-dashed border-accent/25"
        />
        <div className="flex flex-col gap-px overflow-hidden rounded-lg opacity-90">
          <article className="rounded-r-lg rounded-l-sm border border-border border-l-4 border-l-accent bg-background/95 p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:gap-6">
              <div className="flex shrink-0 items-center justify-between gap-4 pt-0.5 md:w-16 md:flex-col md:items-start md:justify-start md:gap-1">
                <div className="flex items-baseline gap-0.5">
                  <span className="font-mono text-4xl leading-none font-bold tracking-tighter text-foreground">
                    94
                  </span>
                  <span className="font-mono text-sm font-medium text-accent">%</span>
                </div>
                <div className="mt-1 flex w-24 gap-[2px] md:w-full">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className={cn("h-1.5 flex-1 rounded-[1px]", "bg-accent")} />
                  ))}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-accent">
                    r/saas
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/50">2h ago</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h4 className="truncate text-[17px] leading-snug font-medium text-foreground md:text-lg">
                    &ldquo;Anyone know a tool that tracks this automatically? Doing it by hand is
                    killing me&rdquo;
                  </h4>
                  <div className="flex w-max max-w-full items-center gap-2 rounded bg-accent/10 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(74,106,94,0.3)]">
                    <Target fill="currentColor" className="size-3.5 shrink-0 text-accent" />
                    <span className="truncate pr-2 text-[13px] text-foreground/90">
                      Signal match:{" "}
                      <strong className="font-medium text-accent">
                        Describes the exact problem your product solves
                      </strong>
                    </span>
                  </div>
                </div>

                <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/60">
                  Every week I&apos;m exporting this manually and it takes forever. There has to be
                  something that just does this for me already.
                </p>
              </div>

              <div className="flex shrink-0 flex-row justify-end gap-2 border-t border-border/30 pt-3 md:w-32 md:flex-col md:border-t-0 md:border-l md:pt-0 md:pl-5">
                <span className="order-2 flex w-full items-center justify-center gap-2 rounded bg-secondary px-5 py-2 font-mono text-[11px] tracking-wider text-foreground uppercase shadow-[0_0_0_1px_var(--border)] md:order-1">
                  <MessageCircle className="size-3.5" />
                  Reply
                </span>
              </div>
            </div>
          </article>

          <div className="rounded-lg border border-border bg-background/95 p-4 md:p-5">
            <span className="mb-2 inline-block font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Drafted reply
            </span>
            <p className="text-[14px] leading-relaxed text-foreground/90">
              Ran into the exact same thing before building Getrive — happy to share what we set
              up if useful. It automatically catches posts like this one so you&apos;re not doing
              it by hand every week.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
