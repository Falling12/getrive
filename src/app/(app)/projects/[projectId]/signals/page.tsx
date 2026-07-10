import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { truncate } from "@/lib/format";
import { formatSourceLabel } from "@/lib/sources/format";
import { SignalFilterBar } from "@/components/signals/signal-filter-bar";
import { SignalCard } from "@/components/signals/signal-card";
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

export default async function SignalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ source?: string; status?: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const { source, status = "all" } = await searchParams;

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
    take: 50,
  });

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

        <section className="flex flex-col gap-4">
          {signals.length === 0 ? (
            <p className="py-16 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
              No signals yet — listening for new posts.
            </p>
          ) : (
            signals.map((signal) => (
              <SignalCard
                key={signal.id}
                projectId={projectId}
                signal={{
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
                }}
              />
            ))
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
