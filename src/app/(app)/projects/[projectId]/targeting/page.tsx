import type { Metadata } from "next";
import Link from "next/link";
import { getTargetingData } from "./data";
import { TargetingSection } from "@/components/targeting/targeting-section";
import { PositioningSummary } from "@/components/targeting/positioning-summary";
import { SourcesPanel } from "@/components/targeting/sources-panel";
import { SearchIntelligencePanel } from "@/components/targeting/search-intelligence-panel";

export const metadata: Metadata = { title: "Targeting — Getrive" };

// Measurement can run for minutes (Reddit's rate limit) — see
// measure-stream/route.ts and home/page.tsx's identical comment for
// poll-stream.
export const maxDuration = 300;

// One page, one story: who you sell to (positioning), where Getrive listens
// (sources), what it matches (search pipeline, allowlist-only). These were
// three separate nav destinations; each is now one card, read-first, with
// the edit affordances tucked behind disclosure — Targeting is visited by
// exception (Home's attention cards deep-link here), not by habit.
//
// Layout experiment: /targeting/v2 renders these same sections behind an
// onboarding-style phase rail instead of a stacked scroll — one of the two
// shells gets deleted once a winner is picked.
export default async function TargetingPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await getTargetingData(projectId);

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-24 md:pt-0">
      <div className="flex w-full flex-col gap-6 px-4 pt-8 md:px-8 md:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-wide text-foreground">Targeting</h1>
            <p className="mt-1 max-w-[68ch] font-mono text-xs leading-relaxed text-muted-foreground">
              What Getrive listens for — edits here re-score every future post.
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/targeting/v2`}
            className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Try layout v2 →
          </Link>
        </header>

        <TargetingSection id="positioning" step="Who" title="Positioning & ICP" dataTour="positioning">
          <PositioningSummary {...data.positioningProps} />
        </TargetingSection>

        <TargetingSection
          id="sources"
          step="Where"
          title="Sources"
          meta={`${data.sourceRows.length} monitored`}
          dataTour="source-list"
        >
          <SourcesPanel
            projectId={projectId}
            sources={data.sourceRows}
            hasHackerNews={data.hasHackerNews}
            hasIndieHackers={data.hasIndieHackers}
            hasAskMetaFilter={data.hasAskMetaFilter}
          />
        </TargetingSection>

        {data.showSearchPipeline && (
          <TargetingSection
            id="search"
            step="What"
            title="Search intelligence"
            meta={
              data.searchData.active.length > 0
                ? `${data.searchData.active.length} active queries`
                : undefined
            }
          >
            <SearchIntelligencePanel projectId={projectId} data={data.searchData} />
          </TargetingSection>
        )}
      </div>
    </div>
  );
}
