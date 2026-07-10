// The same topographic contour field used across the whole app — shared
// brand kit, so this texture is the one constant across every page.
export function TopoBackdrop() {
  return (
    <div
      aria-hidden
      className="auth-topo pointer-events-none fixed inset-0 z-0 scale-110 animate-[auth-drift_60s_linear_infinite]"
    />
  );
}
