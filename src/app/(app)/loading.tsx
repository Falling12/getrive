import { RouteLoading } from "@/components/shared/route-loading";

// Sits in the same folder as (app)/layout.tsx, so it wraps every nested
// segment below it (the /projects picker and the whole /projects/[projectId]
// tree, including that layout's own sidebar/product data fetch) in a
// Suspense boundary — but not (app)/layout.tsx's own requireSession() call,
// which is a single cheap session lookup. This is what makes first entry
// into the authenticated app (e.g. right after login) show something
// immediately instead of a blank/frozen screen.
export default function Loading() {
  return <RouteLoading label="Loading Getrive…" />;
}
