import type { LucideIcon } from "lucide-react";

export function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <article className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-xl border border-border bg-secondary/5 p-5">
      <div className="absolute top-0 right-0 size-16 rounded-full bg-secondary/20 blur-2xl transition-colors duration-500 group-hover:bg-accent/20" />
      <header className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground/60 transition-colors group-hover:text-accent" />
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
      </header>
      <div className="text-4xl font-medium tracking-tight text-foreground">{value}</div>
    </article>
  );
}
