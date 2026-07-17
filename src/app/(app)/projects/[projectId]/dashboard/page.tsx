import type { Metadata } from "next";
import { Radar, MessageSquareText, TrendingUp } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/dashboard/stat-tile";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { AutoFirstScan } from "@/components/dashboard/auto-first-scan";
import { ExampleSignalPreview } from "@/components/dashboard/example-signal-preview";
import { CONSECUTIVE_FAILURE_ALERT_THRESHOLD } from "@/lib/limits";
import { POLL_STALE_MINUTES } from "@/lib/reddit/poll";
import { formatSourceLabel } from "@/lib/sources/format";
import { parseSignupGoalTarget } from "@/lib/signup-goal";

export const metadata: Metadata = { title: "Dashboard — Getrive" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
  });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    usersAcquired,
    signalsThisWeek,
    repliesSent,
    karmaAgg,
    agingSignals,
    failingSources,
    selectedSourceCount,
    everScoredCount,
  ] = await Promise.all([
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

  const goalTarget = parseSignupGoalTarget(product.signupGoal);
  const goalShare = goalTarget ? Math.min(100, Math.round((usersAcquired / goalTarget) * 100)) : null;
  const isPollActive = Boolean(
    product.activePollStartedAt &&
      Date.now() - product.activePollStartedAt.getTime() < POLL_STALE_MINUTES * 60_000
  );
  // Durable, DB-derived replacement for the old `?firstscan=1` query-param
  // trigger: "this project has at least one monitored source and has never
  // scored a single post" can only ever be true once, flips permanently
  // false the moment any post is scored, and survives page refreshes,
  // duplicate tabs, and lost/stripped query strings — none of which the URL
  // param did. See AutoFirstScan for how this replaces that gate.
  const needsFirstScan = selectedSourceCount > 0 && everScoredCount === 0;

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-16 md:pt-0">
      <div className="flex w-full max-w-5xl flex-col px-6 pt-12 md:px-12 md:pt-20 lg:pt-24">
        <AutoFirstScan projectId={projectId} initialIsActive={isPollActive} needsFirstScan={needsFirstScan} />

        <section data-tour="metric" className="relative flex w-full flex-col border-b-2 border-border pb-16 md:pb-24">
          <div className="pointer-events-none absolute top-0 right-0 size-32 rounded-full bg-accent/10 blur-[80px]" />

          <h2 className="mb-6 flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase md:mb-8">
            <span className="size-2 rounded-sm bg-accent" />
            Primary target
          </h2>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-8">
            <h1 className="-ml-2 flex items-baseline text-[7rem] leading-[0.75] font-medium tracking-[-0.04em] text-foreground md:text-[11rem]">
              {usersAcquired}
              {goalTarget && (
                <span className="ml-2 text-[2.5rem] leading-none font-normal text-muted-foreground/50 md:text-[4rem]">
                  /{goalTarget}
                </span>
              )}
            </h1>
            <div className="flex max-w-sm flex-col gap-2 pb-2 lg:pb-6">
              <span className="text-2xl leading-tight text-accent md:text-3xl">
                Users acquired through Getrive
              </span>
              {goalTarget ? (
                <>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                    {goalShare}% toward your goal — &ldquo;{product.signupGoal}&rdquo;
                  </p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary/30">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${goalShare}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  Signups matched back to an Getrive-assisted reply. Keep listening and replying to
                  grow this.
                </p>
              )}
            </div>
          </div>
        </section>

        <section data-tour="stats" className="mt-12 grid w-full grid-cols-1 gap-4 md:mt-16 md:grid-cols-3">
          <StatTile icon={Radar} label="Signals caught this week" value={signalsThisWeek} />
          <StatTile icon={MessageSquareText} label="Replies sent" value={repliesSent} />
          <StatTile icon={TrendingUp} label="Karma tracked" value={karmaAgg._sum.currentKarma ?? 0} />
        </section>

        {usersAcquired === 0 && <ExampleSignalPreview />}

        <NeedsAttention
          projectId={projectId}
          agingSignals={agingSignals}
          failingSources={failingSources.map((s) => ({
            name: formatSourceLabel(s.type, s.name),
            consecutiveFailures: s.consecutiveFailures,
          }))}
        />
      </div>
    </div>
  );
}
