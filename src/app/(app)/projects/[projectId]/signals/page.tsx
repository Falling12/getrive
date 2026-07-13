import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { truncate } from "@/lib/format";
import { formatSourceLabel } from "@/lib/sources/format";
import { SignalFilterBar } from "@/components/signals/signal-filter-bar";
import { SignalCard } from "@/components/signals/signal-card";
import { SignalGroup } from "@/components/signals/signal-group";
import { PollNowButton } from "@/components/signals/poll-now-button";
import { POLL_STALE_MINUTES } from "@/lib/reddit/poll";

export const metadata: Metadata = { title: "Signals — Getrive" };

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

export default async function SignalsPage({
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
  });
  const isPollActive = Boolean(
    product.activePollStartedAt &&
      Date.now() - product.activePollStartedAt.getTime() < POLL_STALE_MINUTES * 60_000
  );

  const sources = await prisma.source.findMany({
    where: { productId: product.id, selected: true },
    include: { _count: { select: { signals: true } } },
    orderBy: { rank: "asc" },
  });

  const signals = await prisma.signal.findMany({
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
  });

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
      <div className="flex w-full max-w-[1000px] flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
        <div className="flex w-full flex-col overflow-hidden rounded-xl bg-background shadow-[inset_0_0_0_1px_var(--border)]">
          <header className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-gradient-to-r from-secondary/15 to-transparent p-5 md:px-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-medium tracking-wide text-foreground">Signals</h1>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent/50" />
                <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
              </span>
            </div>
            <PollNowButton projectId={projectId} initialIsActive={isPollActive} />
          </header>

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
            <p className="py-16 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
              No signals yet — listening for new posts.
            </p>
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

          {signals.length > 0 && (
            <div className="flex w-full flex-col items-center justify-center gap-2 py-8 opacity-50">
              <div className="size-1 rounded-full bg-border" />
              <div className="size-1 rounded-full bg-border" />
              <span className="mt-2 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Threshold {product.relevanceThreshold.toFixed(2)}
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
