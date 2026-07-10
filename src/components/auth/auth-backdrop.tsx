// Fixed background layers shared by every auth surface: a center crosshair
// (structural grid anchor) plus a slowly drifting topographic contour field.
// Ported 1:1 from the AIDesigner artifact's `.grid-lines`/`.topo-bg`.
export function AuthBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border/30" />
        <div className="absolute top-1/2 right-0 left-0 h-px -translate-y-1/2 bg-border/30" />
      </div>
      <div
        aria-hidden
        className="auth-topo pointer-events-none fixed inset-0 scale-110 animate-[auth-drift_60s_linear_infinite]"
      />
    </>
  );
}
