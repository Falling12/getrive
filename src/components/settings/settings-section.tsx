export function SettingsSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-xl bg-background/90 p-6 shadow-[inset_0_0_0_1px_var(--border)] backdrop-blur-md transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_var(--accent)] md:p-8">
      <div>
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <p className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  );
}
