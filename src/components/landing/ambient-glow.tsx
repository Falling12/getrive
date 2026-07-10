// Two large, softly drifting blurred color blobs — the landing page's
// extra layer of atmosphere on top of the shared .auth-topo contour texture
// (see AuthBackdrop), specific to this page's brighter, more energetic
// accent. Purely decorative, aria-hidden, ignored by prefers-reduced-motion
// via the shared landing-float keyframe already respecting no unnecessary
// re-renders (CSS-only animation).
export function AmbientGlow() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-52 -left-52 size-[600px] animate-[landing-float_10s_ease-in-out_infinite_alternate] rounded-full opacity-[0.15] blur-[120px]"
        style={{ backgroundColor: "var(--accent-glow)" }}
      />
      <div
        className="absolute right-[-300px] bottom-[20%] size-[800px] animate-[landing-float_10s_ease-in-out_infinite_alternate] rounded-full opacity-[0.15] blur-[120px]"
        style={{ backgroundColor: "var(--accent)", animationDelay: "-3s" }}
      />
    </div>
  );
}
