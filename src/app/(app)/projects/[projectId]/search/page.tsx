import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isUnlimitedAccount } from "@/lib/limits";
import { getVenueMiningCandidates } from "@/lib/services/venue-mining.service";
import { formatRelativeTime } from "@/lib/format";
import { MeasureNowButton } from "@/components/search/measure-now-button";
import { IngestionNowButton } from "@/components/search/ingestion-now-button";
import { QueryManagementPanel, type QueryRowData } from "@/components/search/query-management-panel";
import { VenueMiningPanel } from "@/components/search/venue-mining-panel";

export const metadata: Metadata = { title: "Search — Getrive" };

// Measurement can run for minutes (Reddit's rate limit) — see
// measure-stream/route.ts and signals/page.tsx's identical comment for
// poll-stream.
export const maxDuration = 300;

const MEASUREMENT_STALE_MINUTES = 20;
const INGESTION_STALE_MINUTES = 20;

export default async function SearchPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;

  // Absent, not locked/teased — a non-allowlisted founder hitting this URL
  // directly gets the same 404 a nonexistent project would, matching
  // layout.tsx's `if (!project) notFound()` a few lines above where the
  // nav item itself is conditionally rendered.
  if (!isUnlimitedAccount(session.user.email)) notFound();

  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
    include: { positioning: { select: { selectedStatement: true } } },
  });

  const now = Date.now();
  const isMeasuring = Boolean(
    product.activeMeasurementStartedAt &&
      now - product.activeMeasurementStartedAt.getTime() < MEASUREMENT_STALE_MINUTES * 60_000
  );
  const isIngesting = Boolean(
    product.activeIngestionStartedAt &&
      now - product.activeIngestionStartedAt.getTime() < INGESTION_STALE_MINUTES * 60_000
  );

  const [queries, venueMiningCandidates] = await Promise.all([
    prisma.searchQuery.findMany({
      where: { productId: product.id },
      orderBy: [{ platform: "asc" }, { matchCount: "desc" }],
    }),
    getVenueMiningCandidates(product.id),
  ]);

  function toRow(q: (typeof queries)[number]): QueryRowData {
    return {
      id: q.id,
      platform: q.platform,
      text: q.text,
      variantType: q.variantType,
      matchCount: q.matchCount,
      passCount: q.passCount,
      avgMatchScore: q.avgMatchScore,
      retiredReason: q.retiredReason,
    };
  }
  const active = queries.filter((q) => q.status === "ACTIVE").map(toRow);
  const proposed = queries.filter((q) => q.status === "PROPOSED").map(toRow);
  const retired = queries.filter((q) => q.status === "RETIRED").map(toRow);

  const hasPositioning = Boolean(product.positioning?.selectedStatement);
  const monthlyRate = product.baseRateMatchCount != null ? Math.round((product.baseRateMatchCount / 90) * 30) : null;

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-16 md:pt-0">
      <div className="flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
        <header>
          <h1 className="text-2xl font-medium tracking-wide text-foreground">Search</h1>
          <p className="mt-1 max-w-[68ch] font-mono text-xs leading-relaxed text-muted-foreground">
            Measures how often your pain point is mentioned publicly, searches for and scores existing
            conversations, and surfaces venues worth monitoring directly — from real evidence, not guesses.
          </p>
        </header>

        {!hasPositioning ? (
          <section className="overflow-hidden rounded-xl border border-border bg-background p-6">
            <p className="font-mono text-xs text-muted-foreground">
              Set your Positioning first — measurement uses it to generate search queries. Skipped
              automatically by the weekly measurement sweep until then.
            </p>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border border-border bg-background">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-gradient-to-r from-secondary/15 to-transparent p-5 md:px-6">
                <div>
                  <h2 className="text-lg font-medium text-foreground">Base rate</h2>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {product.baseRateMeasuredAt
                      ? `Last measured ${formatRelativeTime(product.baseRateMeasuredAt)}`
                      : "Not measured yet"}
                  </p>
                </div>
                <MeasureNowButton projectId={projectId} initialIsActive={isMeasuring} />
              </header>
              <div className="p-5 md:px-6">
                {product.baseRateClass ? (
                  <div className="flex items-center gap-4">
                    <span
                      className={
                        product.baseRateClass === "HIGH"
                          ? "rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs tracking-wide text-accent"
                          : "rounded-full border border-border bg-secondary/20 px-3 py-1 font-mono text-xs tracking-wide text-muted-foreground"
                      }
                    >
                      {product.baseRateClass}
                    </span>
                    <p className="text-sm text-foreground">
                      Your niche is asked about publicly ~{monthlyRate}/month ({product.baseRateMatchCount}/90d).
                    </p>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">
                    No measurement yet — click &ldquo;Measure now&rdquo; or wait for the weekly sweep.
                  </p>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-background">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-gradient-to-r from-secondary/15 to-transparent p-5 md:px-6">
                <div>
                  <h2 className="text-lg font-medium text-foreground">Ingestion</h2>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {product.lastIngestionAt
                      ? `Last run ${formatRelativeTime(product.lastIngestionAt)}`
                      : "Not run yet"}
                  </p>
                </div>
                <IngestionNowButton projectId={projectId} />
                {isIngesting && (
                  <p className="w-full font-mono text-[11px] text-muted-foreground">A run is already in progress.</p>
                )}
              </header>
              {product.lastIngestionAt && (
                <div className="flex flex-wrap gap-4 p-5 font-mono text-xs text-muted-foreground md:px-6">
                  <span>{product.lastIngestionMatched ?? 0} matched</span>
                  <span>{product.lastIngestionFiltered ?? 0} filtered</span>
                  <span>{product.lastIngestionScored ?? 0} scored</span>
                  <span className="text-accent">{product.lastIngestionSignals ?? 0} signals</span>
                  {!!product.lastIngestionErrors && (
                    <span className="text-destructive">{product.lastIngestionErrors} errors</span>
                  )}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-medium text-foreground">Queries</h2>
              <QueryManagementPanel projectId={projectId} active={active} proposed={proposed} retired={retired} />
            </section>

            <section>
              <h2 className="mb-3 text-lg font-medium text-foreground">Venue mining</h2>
              <VenueMiningPanel projectId={projectId} candidates={venueMiningCandidates} />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
