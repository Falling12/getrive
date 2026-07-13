// Shared fallback for route-level loading.tsx files — every authenticated
// page fetches its data server-side with no client-side loading state of
// its own, so without this, clicking between pages (e.g. Dashboard ->
// Signals) looks like the app froze for 1-2s before the new page pops in.
// Visual language matches ReplyDraftSkeleton/OnboardingLoading (accent
// spinner ring + uppercase mono caption) rather than a generic spinner.
export function RouteLoading({ label }: { label: string }) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 py-24">
      <div className="relative size-10">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}
