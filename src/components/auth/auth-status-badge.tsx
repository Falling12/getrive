// Decorative "everything's connected" indicator, top-right on desktop —
// ported from the artifact's "Signal Node: Online" marker. Purely
// atmospheric (no real connection state behind it).
export function AuthStatusBadge() {
  return (
    <div
      className="animate-[auth-fade-in_0.5s_ease-out_forwards] absolute top-8 right-8 hidden items-center gap-2 font-mono text-[10px] tracking-widest text-accent uppercase opacity-0 md:flex"
      style={{ animationDelay: "0.8s" }}
    >
      <div className="size-1.5 animate-[auth-pulse-slow_3s_ease-in-out_infinite] rounded-full bg-accent" />
      Signal node: online
    </div>
  );
}
