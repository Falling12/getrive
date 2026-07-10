export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
