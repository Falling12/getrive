import { RouteLoading } from "@/components/shared/route-loading";

// The projects/[projectId] layout (sidebar, mobile nav) stays mounted across
// sibling navigations within a project — this boundary is what actually
// catches the Dashboard page's own data fetch on a Signals -> Dashboard
// click, since (app)/loading.tsx sits above the shared layout and is
// invisible to that navigation.
export default function Loading() {
  return <RouteLoading label="Loading dashboard…" />;
}
