import Link from "next/link";
import { ArrowUpCircle, HourglassIcon, AlertTriangle, ArrowRight } from "lucide-react";

export interface ReadySourceItem {
  name: string;
}

export interface AgingSignalItem {
  id: string;
  title: string;
}

export interface FailingSourceItem {
  name: string;
  consecutiveFailures: number;
}

export function NeedsAttention({
  projectId,
  readySources,
  agingSignals,
  failingSources,
}: {
  projectId: string;
  readySources: ReadySourceItem[];
  agingSignals: AgingSignalItem[];
  failingSources: FailingSourceItem[];
}) {
  const isEmpty =
    readySources.length === 0 && agingSignals.length === 0 && failingSources.length === 0;

  return (
    <section className="mt-16 flex w-full flex-col gap-6 md:mt-20">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <h3 className="flex items-center gap-2 text-xl font-medium text-foreground">
          Needs attention
          {!isEmpty && <span className="inline-block size-2.5 animate-[auth-pulse-slow_3s_ease-in-out_infinite] rounded-full bg-accent" />}
        </h3>
      </header>

      {isEmpty ? (
        <p className="py-6 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Nothing needs attention right now.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60 border-t border-border/60">
          {failingSources.map((src) => (
            <Link
              key={src.name}
              href={`/projects/${projectId}/sources`}
              className="group relative -mx-2 flex flex-col items-start justify-between gap-4 rounded-lg px-2 py-5 transition-colors hover:bg-destructive/5 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded border border-destructive/30 bg-destructive/10 text-destructive">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="flex flex-col gap-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-destructive/10 px-2 py-0.5 font-mono text-[11px] text-destructive">
                      {src.name}
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-destructive/80 uppercase">
                      Ingestion failing
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {`${src.consecutiveFailures} failed fetch attempts in a row — this isn't just a quiet source.`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center rounded border border-destructive/30 bg-background/50 px-4 py-2 font-mono text-sm text-destructive transition-all group-hover:bg-destructive/10">
                Investigate
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}

          {readySources.map((src) => (
            <Link
              key={src.name}
              href={`/projects/${projectId}/sources`}
              className="group relative -mx-2 flex flex-col items-start justify-between gap-4 rounded-lg px-2 py-5 transition-colors hover:bg-secondary/10 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-background text-accent">
                  <ArrowUpCircle className="size-5" />
                </div>
                <div className="flex flex-col gap-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-secondary/40 px-2 py-0.5 font-mono text-[11px] text-foreground">
                      {src.name}
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      Unlock
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This source is karma-ready. You can post here now.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center rounded border border-border bg-background/50 px-4 py-2 font-mono text-sm text-foreground transition-all group-hover:border-accent group-hover:bg-accent/10">
                Post now
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}

          {agingSignals.map((signal) => (
            <Link
              key={signal.id}
              href={`/projects/${projectId}/signals/${signal.id}`}
              className="group relative -mx-2 flex flex-col items-start justify-between gap-4 rounded-lg px-2 py-5 transition-colors hover:bg-secondary/10 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground">
                  <HourglassIcon className="size-5" />
                </div>
                <div className="flex flex-col gap-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground">
                      &gt; 24h
                    </span>
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      Unresolved signal
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    &ldquo;{signal.title}&rdquo; has no drafted reply.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center rounded border border-border bg-background/50 px-4 py-2 font-mono text-sm text-foreground transition-all group-hover:border-accent group-hover:bg-accent/10">
                Draft reply
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
