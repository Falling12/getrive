import { RouteLoading } from "@/components/shared/route-loading";

// This is the exact click the freeze was reported on (Signals list ->
// a signal's detail page). The detail page's own AI reply draft already has
// its own inner Suspense (ReplyDraftSkeleton) for the slower LLM call — this
// boundary covers the outer page (signal lookup, thread rendering) that was
// previously fully unguarded.
export default function Loading() {
  return <RouteLoading label="Loading signal…" />;
}
