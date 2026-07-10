import { MessageSquareText, Zap } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

export interface AttributionLogRow {
  id: string;
  channelDetail: string | null;
  note: string | null;
  createdAt: Date;
  source: "MANUAL" | "AUTOMATIC";
}

export function AttributionLog({ rows }: { rows: AttributionLogRow[] }) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-end justify-between border-b border-border pb-2">
        <h2 className="text-lg font-medium text-foreground">Attribution log</h2>
      </header>

      {rows.length === 0 ? (
        <p className="py-6 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
          No signups logged yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="-mx-2 flex flex-col justify-between gap-3 border-b border-border/60 px-2 py-4 transition-colors last:border-b-0 hover:bg-secondary/10 md:flex-row md:items-center"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] text-foreground">
                    Signup #{rows.length - index}
                  </span>
                  {row.source === "AUTOMATIC" && (
                    <span className="flex items-center gap-1 rounded-sm bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">
                      <Zap className="size-2.5" fill="currentColor" />
                      Auto
                    </span>
                  )}
                </div>
                {row.note && (
                  <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MessageSquareText className="size-3 opacity-60" />
                    {row.note}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                {row.channelDetail ? (
                  <span className="rounded-sm border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent">
                    {row.channelDetail}
                  </span>
                ) : (
                  <span className="rounded-sm border border-dashed border-border px-2 py-0.5 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                    Untracked
                  </span>
                )}
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  {formatRelativeTime(row.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
