// Same topographic contour field as the auth screens, ported from the
// onboarding-specific AIDesigner refinement: the horizontal structural line
// sits at 15% from the top here (not dead-center) since this is a working
// surface, not a centered modal.
export function OnboardingBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="auth-topo pointer-events-none fixed inset-0 scale-110 animate-[auth-drift_90s_linear_infinite] opacity-60"
      />
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border/20" />
        <div className="absolute top-[15%] right-0 left-0 h-px -translate-y-1/2 bg-border/20" />
      </div>
    </>
  );
}
