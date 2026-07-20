import Link from "next/link";

// The Dashboard's stat tiles, collapsed into one quiet row so Home can lead
// with the signal feed instead of a metrics page. "Users acquired" links
// through to Results, where the full attribution story lives.
export function StatStrip({
  projectId,
  usersAcquired,
  goalTarget,
  signalsThisWeek,
  repliesSent,
  karmaTracked,
}: {
  projectId: string;
  usersAcquired: number;
  goalTarget: number | null;
  signalsThisWeek: number;
  repliesSent: number;
  karmaTracked: number;
}) {
  return (
    <section
      data-tour="stats"
      className="grid grid-cols-2 divide-border/60 overflow-hidden rounded-xl border border-border bg-background/80 max-md:gap-px max-md:bg-border/60 md:grid-cols-4 md:divide-x"
    >
      <Link
        href={`/projects/${projectId}/results`}
        className="group flex flex-col gap-1 bg-background p-4 transition-colors hover:bg-secondary/15 md:px-5"
      >
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Users acquired
        </span>
        <span className="text-2xl font-medium tracking-tight text-foreground tabular-nums">
          {usersAcquired}
          {goalTarget != null && (
            <span className="ml-1.5 text-sm font-normal text-accent transition-colors group-hover:text-foreground">
              / {goalTarget} goal
            </span>
          )}
        </span>
      </Link>
      <StatCell label="Signals this week" value={signalsThisWeek} />
      <StatCell label="Replies sent" value={repliesSent} />
      <StatCell label="Karma tracked" value={karmaTracked} />
    </section>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 bg-background p-4 md:px-5">
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className="text-2xl font-medium tracking-tight text-foreground tabular-nums">{value}</span>
    </div>
  );
}
