import { RouteLoading } from "@/components/shared/route-loading";

// Reached from the sidebar's "new project" action as well as first-time
// signup, so this isn't just a one-time cold load — the requireSession()
// check on every visit deserves its own fallback like every other route.
export default function Loading() {
  return <RouteLoading label="Loading onboarding…" />;
}
