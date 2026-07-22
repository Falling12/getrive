import { formatRelativeTime } from "@/lib/format";
import { MeasureNowButton } from "@/components/search/measure-now-button";
import { QueryManagementPanel, type QueryRowData } from "@/components/search/query-management-panel";

export interface SearchIntelligenceData {
  hasPositioning: boolean;
  baseRateClass: string | null;
  baseRateMatchCount: number | null;
  baseRateMeasuredAt: Date | null;
  queriesEverRun: number;
  queriesRunnable: number;
  monthlyRate: number | null;
  lastIngestionAt: Date | null;
  lastIngestionMatched: number | null;
  lastIngestionScored: number | null;
  lastIngestionSignals: number | null;
  lastIngestionErrors: number | null;
  isMeasuring: boolean;
  active: QueryRowData[];
  proposed: QueryRowData[];
  retired: QueryRowData[];
}

// The "What" section body (search intelligence — query generation,
// measurement, ingestion), shared by both Targeting layouts — see
// sources-panel.tsx for why the bodies are shared.
export function SearchIntelligencePanel({
  projectId,
  data,
}: {
  projectId: string;
  data: SearchIntelligenceData;
}) {
  if (!data.hasPositioning) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        Set your Positioning first — measurement uses it to generate search queries. Skipped
        automatically by the weekly measurement sweep until then.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-border/40 rounded-lg border border-border/60">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <span className="w-20 shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Base rate
          </span>
          {data.baseRateClass ? (
            <>
              <span
                className={
                  data.baseRateClass === "HIGH"
                    ? "rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-accent"
                    : data.baseRateClass === "MEDIUM"
                      ? "rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-amber-600 dark:text-amber-400"
                      : "rounded-full border border-border bg-secondary/20 px-2.5 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground"
                }
              >
                {data.baseRateClass}
              </span>
              <span className="text-[13px] text-foreground">
                asked about ~{data.monthlyRate}/month ({data.baseRateMatchCount}/90d)
              </span>
            </>
          ) : data.queriesEverRun > 0 ? (
            <span className="font-mono text-[11px] text-muted-foreground">
              Still gathering data — {data.queriesEverRun} of {data.queriesRunnable} search queries have run so far
            </span>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">Not measured yet</span>
          )}
          {data.baseRateMeasuredAt && (
            <span className="font-mono text-[10px] text-muted-foreground/60">
              measured {formatRelativeTime(data.baseRateMeasuredAt)}
            </span>
          )}
          <span className="ml-auto">
            <MeasureNowButton projectId={projectId} initialIsActive={data.isMeasuring} />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <span className="w-20 shrink-0 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Ingestion
          </span>
          {data.lastIngestionAt ? (
            <span className="flex flex-wrap gap-x-3 font-mono text-[11px] text-muted-foreground">
              <span>ran {formatRelativeTime(data.lastIngestionAt)}</span>
              <span>{data.lastIngestionMatched ?? 0} matched</span>
              <span>{data.lastIngestionScored ?? 0} scored</span>
              <span className="text-accent">{data.lastIngestionSignals ?? 0} signals</span>
              {!!data.lastIngestionErrors && (
                <span className="text-destructive">{data.lastIngestionErrors} errors</span>
              )}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">Not run yet</span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className="max-w-[68ch] font-mono text-[11px] leading-relaxed text-muted-foreground">
          Search phrases are auto-generated from your positioning — prune, don&apos;t write.
          Proposed queries get promoted automatically once they prove useful.
        </p>
        <QueryManagementPanel
          projectId={projectId}
          active={data.active}
          proposed={data.proposed}
          retired={data.retired}
        />
      </div>
    </>
  );
}
