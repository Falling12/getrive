import { RouteLoading } from "@/components/shared/route-loading";

// The projects/[projectId] layout (sidebar, mobile nav) stays mounted across
// sibling navigations within a project — this boundary is what actually
// catches the Home page's own data fetch on a Targeting -> Home click, since
// (app)/loading.tsx sits above the shared layout and is invisible to that
// navigation. ProductTour also relies on every tour segment having a
// route-level Suspense boundary (see MAX_MEASURE_WAIT_MS there).
export default function Loading() {
  return <RouteLoading label="Loading home…" />;
}
