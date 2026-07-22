import type { Metadata } from "next";
import { getTargetingData } from "./data";
import { PositioningPanel } from "@/components/targeting/v2/positioning-panel";
import { SourcesTargetingPanel } from "@/components/targeting/v2/sources-panel";
import { SearchTargetingPanel } from "@/components/targeting/v2/search-panel";
import { ControlDeck, type TargetingModule } from "@/components/targeting/v2/control-deck";
import {
  CONSECUTIVE_FAILURE_ALERT_THRESHOLD,
  CONSECUTIVE_EMPTY_POLL_ALERT_THRESHOLD,
} from "@/lib/limits";

export const metadata: Metadata = { title: "Targeting — Getrive" };

// Measurement/poll streams can run for minutes.
export const maxDuration = 300;

// Won the layout-experiment comparison against the original stacked-scroll
// shell (now kept, unlinked, at /targeting/v1) — a fused instrument strip
// of three modules (who/where/what), each opening in one shared drawer
// below. See control-deck.tsx for why exactly one module is always open.
export default async function TargetingPage({
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

  const searchHasErrors = Boolean(data.searchData.lastIngestionErrors);
  const searchHasActive = data.searchData.active.length > 0;
  const searchState = !data.searchData.hasPositioning
    ? "neutral"
    : searchHasErrors
      ? "attention"
      : searchHasActive
        ? "good"
        : "neutral";
  modules.push({
    id: "search",
    label: "WHAT (KEYWORDS)",
    readout: String(data.searchData.active.length),
    caption: !data.searchData.hasPositioning
      ? "waiting on positioning"
      : searchHasErrors
        ? `${data.searchData.lastIngestionErrors} ingestion error${data.searchData.lastIngestionErrors === 1 ? "" : "s"}`
        : searchHasActive
          ? "active queries"
          : "no active queries yet",
    state: searchState,
    content: <SearchTargetingPanel projectId={projectId} data={data.searchData} />,
  });

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
        </header>

        <ControlDeck modules={modules} defaultOpenId={defaultOpenId} />
      </div>
    </div>
  );
}
