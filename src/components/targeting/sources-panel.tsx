import type { SourceType } from "@/generated/prisma/client";
import { SourceRow } from "@/components/targeting/source-row";
import { AddSourcesPanel } from "@/components/targeting/add-sources-panel";

export interface SourceRowItem {
  id: string;
  type: SourceType;
  name: string;
  karmaThreshold: number | null;
  currentKarma: number;
  selfPromoNotes: string | null;
  usersAcquired: number;
  lastSuccessfulPollAt: Date | null;
  consecutiveFailures: number;
  consecutiveEmptyPolls: number;
}

// The "Where" section body, shared verbatim by both Targeting layouts
// (stacked v1 and the phase-rail v2) so the two shells can never drift in
// behavior — they only differ in how sections are framed and revealed.
export function SourcesPanel({
  projectId,
  sources,
  hasHackerNews,
  hasIndieHackers,
  hasAskMetaFilter,
}: {
  projectId: string;
  sources: SourceRowItem[];
  hasHackerNews: boolean;
  hasIndieHackers: boolean;
  hasAskMetaFilter: boolean;
}) {
  return (
    <>
      {sources.length === 0 ? (
        <p className="py-8 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
          No active sources yet — add one below.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border/40 rounded-lg border border-border/60">
          {sources.map((src) => (
            <SourceRow key={src.id} projectId={projectId} {...src} />
          ))}
        </div>
      )}

      <AddSourcesPanel
        projectId={projectId}
        hasHackerNews={hasHackerNews}
        hasIndieHackers={hasIndieHackers}
        hasAskMetaFilter={hasAskMetaFilter}
      />
    </>
  );
}
