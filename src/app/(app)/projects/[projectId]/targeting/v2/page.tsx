import type { Metadata } from "next";
import Link from "next/link";
import { getTargetingData } from "../data";
import { PositioningPanel } from "@/components/targeting/v2/positioning-panel";
import { SourcesTargetingPanel } from "@/components/targeting/v2/sources-panel";
import { SearchTargetingPanel } from "@/components/targeting/v2/search-panel";
import { ControlDeck, type TargetingModule } from "@/components/targeting/v2/control-deck";
import {
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD,
} from "@/lib/limits";

export const metadata: Metadata = { title: "Targeting — Getrive" };

// Same reason as ../page.tsx — measurement/poll streams can run for minutes.
export const maxDuration = 300;

// Layout experiment (see ../page.tsx): a fused instrument strip instead of
// stacked cards or a side-scrolling board — see control-deck.tsx for why.
// One of the two shells gets deleted once a winner is picked.
export default async function TargetingV2Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await getTargetingData(projectId);

  const hasPositioningSelection = Boolean(
    data.positioningProps.selectedStatement && data.positioningProps.selectedIcpName
  );
  const positioningState = !hasPositioningSelection
    ? "neutral"
    : data.positioningProps.isStale
      ? "attention"
      : "good";

  const attentionSources = data.sourceRows.filter(
    (s) =>
      s.consecutiveFailures >= CONSECUTIVE_FAILURE_ALERT_THRESHOLD ||
      s.consecutiveEmptyPolls >= CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD
  ).length;
  const sourcesState = data.sourceRows.length === 0 ? "neutral" : attentionSources > 0 ? "attention" : "good";

  const modules: TargetingModule[] = [
    {
      id: "positioning",
      label: "WHO (TARGET USERS)",
      readout: positioningState === "attention" ? "!" : positioningState === "good" ? "OK" : "–",
      caption: !hasPositioningSelection
        ? "Not set up yet"
        : data.positioningProps.isStale
          ? "Stale — worth reconfirming"
          : (data.positioningProps.selectedIcpName ?? ""),
      state: positioningState,
      content: <PositioningPanel {...data.positioningProps} />,
    },
    {
      id: "sources",
      label: "WHERE (Sources)",
      readout: String(data.sourceRows.length),
      caption:
        data.sourceRows.length === 0
          ? "No sources yet"
          : attentionSources > 0
            ? `${attentionSources} need${attentionSources === 1 ? "s" : ""} attention`
            : "all healthy",
      state: sourcesState,
      content: (
        <SourcesTargetingPanel
          projectId={projectId}
          sources={data.sourceRows}
          hasHackerNews={data.hasHackerNews}
          hasIndieHackers={data.hasIndieHackers}
          hasAskMetaFilter={data.hasAskMetaFilter}
        />
      ),
    },
  ];

  if (data.showSearchPipeline) {
    const hasErrors = Boolean(data.searchData.lastIngestionErrors);
    const hasActive = data.searchData.active.length > 0;
    const searchState = !data.searchData.hasPositioning
      ? "neutral"
      : hasErrors
        ? "attention"
        : hasActive
          ? "good"
          : "neutral";
    modules.push({
      id: "search",
      label: "WHAT (KEYWORDS)",
      readout: String(data.searchData.active.length),
      caption: !data.searchData.hasPositioning
        ? "waiting on positioning"
        : hasErrors
          ? `${data.searchData.lastIngestionErrors} ingestion error${data.searchData.lastIngestionErrors === 1 ? "" : "s"}`
          : hasActive
            ? "active queries"
            : "no active queries yet",
      state: searchState,
      content: <SearchTargetingPanel projectId={projectId} data={data.searchData} />,
    });
  }

  const defaultOpenId =
    modules.find((m) => m.state === "attention")?.id ?? modules.find((m) => m.state === "neutral")?.id ?? null;

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-24 md:pt-0">
      <div className="flex w-full flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium tracking-wide text-foreground">Targeting</h1>
            <p className="mt-1 max-w-[68ch] font-mono text-xs leading-relaxed text-muted-foreground">
              What Getrive listens for — edits here re-score every future post.
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/targeting`}
            className="font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            ← Back to layout v1
          </Link>
        </header>

        <ControlDeck modules={modules} defaultOpenId={defaultOpenId} />
      </div>
    </div>
  );
}
