import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { truncate } from "@/lib/format";
import { formatSourceLabel } from "@/lib/sources/format";
import { isPositioningStale } from "@/lib/services/positioning.service";
import { StatStrip } from "@/components/home/stat-strip";
import { AttentionCards } from "@/components/home/attention-cards";
import { AutoFirstScan } from "@/components/home/auto-first-scan";
import { ExampleSignalPreview } from "@/components/home/example-signal-preview";
import { SignalFilterBar } from "@/components/signals/signal-filter-bar";
import { SignalCard } from "@/components/signals/signal-card";
import { SignalGroup } from "@/components/signals/signal-group";
import { PollNowButton } from "@/components/signals/poll-now-button";
import { ThresholdControl } from "@/components/signals/threshold-control";
import { BelowThresholdSection } from "@/components/signals/below-threshold-section";
import { HistoricalMentionsSection } from "@/components/signals/historical-mentions-section";
import { CONSECUTIVE_FAILURE_ALERT_THRESHOLD } from "@/lib/limits";
import { POLL_STALE_MINUTES } from "@/lib/reddit/poll";
import { parseSignupGoalTarget } from "@/lib/signup-goal";
import { isEligibleForScoring } from "@/lib/services/search-ingestion.service";

// How many below-threshold candidates to actually list in the collapsed
// section — bounded independent of the (unbounded) count shown in its
// header, so a source with hundreds of misses doesn't render them all.
const BELOW_THRESHOLD_DISPLAY_LIMIT = 30;

export const metadata: Metadata = { title: "Home — Getrive" };

// Manually triggering a poll can take up to ~2 minutes (Reddit's rate limit
// forces spacing between sources in a batch — see lib/reddit/poll.ts),
// well past the platform's default function timeout.
export const maxDuration = 300;

const STATUS_WHERE: Record<string, Prisma.SignalWhereInput> = {
  "not-replied": { replied: false, dismissed: false },
  replied: { replied: true },
  dismissed: { dismissed: true },
};

// "all" isn't a key in STATUS_WHERE (it maps to no filter at all), so
// validating a cookie value against STATUS_WHERE's keys alone would reject
// a legitimately-remembered "all". This is every value SignalFilterBar's
// STATUS_OPTIONS can produce.
const VALID_STATUSES = new Set(["all", "not-replied", "replied", "dismissed"]);

// Written by proxy.ts whenever a request carries an explicit `status`
// param — read here only as the fallback for when the URL carries none
// at all (see the comment on that cookie write for why "all" has to be
// written explicitly by the filter pills for this to work correctly).
const SIGNALS_STATUS_COOKIE = "signals-status";

// Deliberately higher than the 50-per-status take below — when grouping
// all three statuses together under "All", each group is bucketed out of
// this single fetch rather than queried separately, so it needs enough
// headroom that a status with a lot of history doesn't crowd out the
// others before bucketing happens.
const ALL_STATUSES_TAKE = 150;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ source?: string; status?: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const { source, status: statusParam } = await searchParams;
  // No status in the URL at all (a bare nav-link click, not a filter pill)
  // — fall back to whatever was last explicitly chosen, so the founder
  // doesn't have to re-select "Not replied" on every visit. An explicit
  // `?status=all` from clicking the "All" pill is left alone here, not
  // treated as "no preference" — see signal-filter-bar.tsx.
  const cookieStatus = (await cookies()).get(SIGNALS_STATUS_COOKIE)?.value;
  const status = statusParam ?? (cookieStatus && VALID_STATUSES.has(cookieStatus) ? cookieStatus : "all");

  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
    include: { positioning: true },
  });
  const isPollActive = Boolean(
    product.activePollStartedAt &&
      Date.now() - product.activePollStartedAt.getTime() < POLL_STALE_MINUTES * 60_000
  );

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    sources,
    signals,
    usersAcquired,
    signalsThisWeek,
    repliesSent,
    karmaAgg,
    agingSignals,
    failingSources,
    selectedSourceCount,
    everScoredCount,
  ] = await Promise.all([
    prisma.source.findMany({
      where: { productId: product.id, selected: true },
      include: { _count: { select: { signals: true } } },
      orderBy: { rank: "asc" },
    }),
    prisma.signal.findMany({
      where: {
        source: {
          productId: product.id,
          ...(source ? { name: source } : {}),
        },
        ...(STATUS_WHERE[status] ?? {}),
      },
      include: { source: true },
      orderBy: [{ relevanceScore: "desc" }, { postedAt: "desc" }],
      take: status === "all" ? ALL_STATUSES_TAKE : 50,
    }),
    prisma.signup.count({ where: { productId: product.id, trackedLinkId: { not: null } } }),
    prisma.signal.count({
      where: { source: { productId: product.id }, createdAt: { gte: oneWeekAgo } },
    }),
    prisma.signal.count({
      where: { source: { productId: product.id }, replied: true },
    }),
    prisma.source.aggregate({
      where: { productId: product.id, selected: true },
      _sum: { currentKarma: true },
    }),
    prisma.signal.findMany({
      where: {
        source: { productId: product.id },
        replyDraft: null,
        replied: false,
        dismissed: false,
        createdAt: { lt: oneDayAgo },
      },
      select: { id: true, title: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.source.findMany({
      where: {
        productId: product.id,
        selected: true,
        consecutiveFailures: { gte: CONSECUTIVE_FAILURE_ALERT_THRESHOLD },
      },
      select: { name: true, type: true, consecutiveFailures: true },
    }),
    prisma.source.count({ where: { productId: product.id, selected: true } }),
    prisma.scoredPost.count({ where: { source: { productId: product.id } } }),
  ]);

  // Scoring transparency: posts that were scored but fell below the
  // relevance threshold never became a Signal, so they're invisible
  // everywhere else — this is the only place a founder can see them and
  // sanity-check whether the threshold is filtering out real candidates.
  const belowThresholdWhere = {
    passed: false,
    source: {
      productId: product.id,
      ...(source ? { name: source } : {}),
    },
  };
  const [belowThresholdCount, belowThresholdPosts] = await Promise.all([
    prisma.scoredPost.count({ where: belowThresholdWhere }),
    prisma.scoredPost.findMany({
      where: belowThresholdWhere,
      include: { source: true },
      orderBy: { scoredAt: "desc" },
      take: BELOW_THRESHOLD_DISPLAY_LIMIT,
    }),
  ]);

  // Historical mentions — Phase 2B's age/state bucketing (isEligibleForScoring,
  // search-ingestion.service.ts) never scores these, so they never become a
  // Signal or a ScoredPost row anywhere else. Reuses that exact predicate
  // rather than re-deriving the same rule as a Prisma where clause, so the
  // two never drift apart. Bounded to a recent window (most-recent-first)
  // for display, same spirit as BELOW_THRESHOLD_DISPLAY_LIMIT above — not a
  // claim of the true all-time count for very high-volume products.
  const HISTORICAL_SCAN_WINDOW = 300;
  const recentSearchResults = await prisma.searchResult.findMany({
    where: { productId: product.id, ...(source ? { venue: source } : {}) },
    orderBy: { postedAt: "desc" },
    take: HISTORICAL_SCAN_WINDOW,
  });
  const historicalMentions = recentSearchResults
    .filter((r) => !isEligibleForScoring(r))
    .slice(0, BELOW_THRESHOLD_DISPLAY_LIMIT);

  // Durable, DB-derived replacement for the old `?firstscan=1` query-param
  // trigger: "this project has at least one monitored source and has never
  // scored a single post" can only ever be true once, flips permanently
  // false the moment any post is scored, and survives page refreshes,
  // duplicate tabs, and lost/stripped query strings — none of which the URL
  // param did. See AutoFirstScan for how this replaces that gate.
  const needsFirstScan = selectedSourceCount > 0 && everScoredCount === 0;

  const positioningStale = isPositioningStale(product, product.positioning);

  function toCardProps(signal: (typeof signals)[number]) {
    return {
      id: signal.id,
      sourceLabel: formatSourceLabel(signal.source.type, signal.source.name),
      title: signal.title,
      snippet: truncate(signal.body, 200),
      permalink: signal.permalink,
      relevanceScore: signal.relevanceScore,
      relevanceReason: signal.relevanceReason,
      postedAt: signal.postedAt,
      replied: signal.replied,
      dismissed: signal.dismissed,
      isSearchOrigin: signal.source.discoveredViaSearch,
    };
  }

  // Only meaningful for "all" — a single status filter is already one
  // group. Bucketed from the one fetch above (already sorted by relevance
  // then recency) rather than three separate queries, so ordering within
  // each bucket is preserved for free.
  const groups =
    status === "all"
      ? {
          notReplied: signals.filter((s) => !s.replied && !s.dismissed),
          replied: signals.filter((s) => s.replied && !s.dismissed),
          dismissed: signals.filter((s) => s.dismissed),
        }
      : null;

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-12 md:pt-0">
      <div className="flex w-full flex-col gap-6 px-4 pt-8 md:px-8 md:pt-12">
        <AutoFirstScan projectId={projectId} initialIsActive={isPollActive} needsFirstScan={needsFirstScan} />

        <StatStrip
          projectId={projectId}
          usersAcquired={usersAcquired}
          goalTarget={parseSignupGoalTarget(product.signupGoal)}
          signalsThisWeek={signalsThisWeek}
          repliesSent={repliesSent}
          karmaTracked={karmaAgg._sum.currentKarma ?? 0}
        />

        {/* Removed because it makes the ui cluttered */}
        {/* <AttentionCards
          projectId={projectId}
          positioningStale={positioningStale}
          failingSources={failingSources.map((s) => ({
            name: formatSourceLabel(s.type, s.name),
            consecutiveFailures: s.consecutiveFailures,
          }))}
          agingSignals={agingSignals}
        /> */}

        <div
          id="signal-feed"
          className="flex w-full scroll-mt-6 flex-col overflow-hidden rounded-xl bg-background shadow-[inset_0_0_0_1px_var(--border)]"
        >
          <header className="flex w-full flex-col gap-2 border-b border-border/60 bg-gradient-to-r from-secondary/15 to-transparent p-4 md:px-6">
            <PollNowButton projectId={projectId} initialIsActive={isPollActive}>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-medium tracking-wide text-foreground">Signals</h1>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/50" />
                  <span className="relative inline-flex size-2 rounded-full bg-accent" />
                </span>
              </div>
            </PollNowButton>
          </header>

          <ThresholdControl projectId={projectId} initialThreshold={product.relevanceThreshold} />

          <SignalFilterBar
            projectId={projectId}
            sources={sources.map((s) => ({
              name: s.name,
              type: s.type,
              label: formatSourceLabel(s.type, s.name),
              count: s._count.signals,
            }))}
            activeSource={source}
            activeStatus={status}
          />
        </div>

        <section data-tour="signal-list" className="flex flex-col gap-6">
          {signals.length === 0 ? (
            <>
              <p className="py-10 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
                No signals yet — listening for new posts.
              </p>
              <ExampleSignalPreview />
            </>
          ) : groups ? (
            <>
              <SignalGroup label="Not replied" count={groups.notReplied.length} defaultOpen>
                {groups.notReplied.map((signal) => (
                  <SignalCard key={signal.id} projectId={projectId} signal={toCardProps(signal)} />
                ))}
              </SignalGroup>
              <SignalGroup label="Replied" count={groups.replied.length} defaultOpen={false}>
                {groups.replied.map((signal) => (
                  <SignalCard key={signal.id} projectId={projectId} signal={toCardProps(signal)} />
                ))}
              </SignalGroup>
              <SignalGroup label="Dismissed" count={groups.dismissed.length} defaultOpen={false}>
                {groups.dismissed.map((signal) => (
                  <SignalCard key={signal.id} projectId={projectId} signal={toCardProps(signal)} />
                ))}
              </SignalGroup>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              {signals.map((signal) => (
                <SignalCard key={signal.id} projectId={projectId} signal={toCardProps(signal)} />
              ))}
            </div>
          )}

          <BelowThresholdSection
            totalCount={belowThresholdCount}
            items={belowThresholdPosts.map((p) => ({
              id: p.id,
              title: p.title,
              permalink: p.permalink,
              relevanceScore: p.relevanceScore,
              scoredAt: p.scoredAt,
              sourceType: p.source.type,
              sourceName: p.source.name,
            }))}
          />

          <HistoricalMentionsSection
            totalCount={historicalMentions.length}
            items={historicalMentions.map((r) => ({
              id: r.id,
              title: r.title,
              permalink: r.permalink,
              venue: r.venue,
              postedAt: r.postedAt,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
