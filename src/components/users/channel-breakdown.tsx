import { TrendingUp } from "lucide-react";

export function WhatsWorkingCallout({
  topChannelLabel,
  topCount,
  totalAttributed,
}: {
  topChannelLabel: string | null;
  topCount: number;
  totalAttributed: number;
}) {
  if (!topChannelLabel || totalAttributed === 0) {
    return (
      <section className="relative flex items-start gap-4 overflow-hidden rounded-lg border border-accent/30 bg-accent/5 p-5">
        <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
        <div className="flex size-10 shrink-0 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
          <TrendingUp className="size-5" />
        </div>
        <div className="flex flex-col gap-1.5 pt-0.5">
          <h3 className="font-mono text-xs font-semibold tracking-widest text-accent uppercase">
            Discovery insight
          </h3>
          <p className="text-[15px] leading-relaxed text-foreground">
            No attributed signups yet — generate a tracked link and log signups as they come in to
            see what&apos;s working.
          </p>
        </div>
      </section>
    );
  }

  const share = Math.round((topCount / totalAttributed) * 100);

  return (
    <section className="relative flex items-start gap-4 overflow-hidden rounded-lg border border-accent/30 bg-accent/5 p-5">
      <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
      <div className="flex size-10 shrink-0 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent">
        <TrendingUp className="size-5" />
      </div>
      <div className="flex flex-col gap-1.5 pt-0.5">
        <h3 className="font-mono text-xs font-semibold tracking-widest text-accent uppercase">
          Discovery insight
        </h3>
        <p className="text-[15px] leading-relaxed text-foreground">
          <span className="font-medium">{topChannelLabel}</span> is your top channel, driving{" "}
          <span className="rounded bg-accent/10 px-1 font-mono text-accent">{share}%</span> of
          attributed signups.
        </p>
      </div>
    </section>
  );
}

export function ChannelBreakdown({ rows }: { rows: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-end justify-between border-b border-border pb-2">
        <h2 className="text-lg font-medium text-foreground">Signups by channel</h2>
      </header>

      {rows.length === 0 ? (
        <p className="py-6 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
          No attributed signups yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <div key={row.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs ${
                    index === 0
                      ? "bg-accent/10 text-foreground"
                      : "border border-border text-muted-foreground"
                  }`}
                >
                  {row.label}
                </span>
                <span className="font-mono text-xs text-foreground">{row.count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/30">
                <div
                  className={`h-full rounded-full ${index === 0 ? "bg-accent" : "bg-secondary"}`}
                  style={{ width: `${(row.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
