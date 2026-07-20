// One card per Targeting concern. The Who → Where → What step labels carry
// real pipeline order, not decoration: positioning generates the search
// queries, sources scope where they run, and each section's output feeds
// the next one's scoring. Home's contextual attention cards deep-link to
// the `id` anchors.
export function TargetingSection({
  id,
  step,
  title,
  meta,
  dataTour,
  children,
}: {
  id: string;
  step: string;
  title: string;
  meta?: string;
  dataTour?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      data-tour={dataTour}
      className="scroll-mt-6 overflow-hidden rounded-xl border border-border bg-background"
    >
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border/60 bg-gradient-to-r from-secondary/15 to-transparent px-5 py-4 md:px-6">
        <span className="w-12 shrink-0 font-mono text-[10px] font-medium tracking-[0.2em] text-accent uppercase">
          {step}
        </span>
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        {meta && (
          <span className="ml-auto font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {meta}
          </span>
        )}
      </header>
      <div className="flex flex-col gap-5 p-5 md:p-6">{children}</div>
    </section>
  );
}
