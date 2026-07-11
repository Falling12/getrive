import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Target, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/format";
import { formatSourceLabel, formatAuthorLabel, formatViewOnLabel } from "@/lib/sources/format";
import { ReplyDraftSection } from "@/components/signal-detail/reply-draft-section";
import { ReplyDraftSkeleton } from "@/components/signal-detail/reply-draft-skeleton";
import { EventOnMount } from "@/components/analytics/event-on-mount";

export const metadata: Metadata = { title: "Signal — Getrive" };

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const session = await requireSession();
  const { projectId, id } = await params;

  const signal = await prisma.signal.findFirst({
    where: { id, source: { product: { userId: session.user.id } } },
    include: { source: true },
  });
  if (!signal) notFound();

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-16 md:pt-0">
      <EventOnMount event="first_signal_viewed" properties={{ signal_id: signal.id }} />
      <div className="flex w-full max-w-[800px] flex-col gap-6 px-4 pt-8 md:px-8 md:pt-12">
        <Link
          href={`/projects/${projectId}/signals`}
          className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to signals
        </Link>

        <article className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-3">
              <span className="rounded bg-secondary/40 px-2 py-0.5 font-mono text-[11px] text-foreground shadow-[inset_0_0_0_1px_var(--border)]">
                {formatSourceLabel(signal.source.type, signal.source.name)}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatAuthorLabel(signal.source.type, signal.author)}
              </span>
              <div className="size-1 rounded-full bg-border" />
              <span className="font-mono text-[10px] text-muted-foreground/50">
                {formatRelativeTime(signal.postedAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 rounded border border-accent/40 bg-accent/10 px-4 py-2 sm:flex-row sm:items-center">
            <div className="flex shrink-0 items-center gap-1.5">
              <Target className="size-3.5 text-accent" />
              <span className="font-mono text-[11px] font-semibold text-accent">
                {Math.round(signal.relevanceScore * 100)}% match
              </span>
            </div>
            <div className="hidden h-4 w-px bg-accent/30 sm:block" />
            <p className="text-[13px] leading-snug text-muted-foreground">{signal.relevanceReason}</p>
          </div>

          <div className="mt-1 flex flex-col gap-3">
            <h1 className="text-2xl font-medium leading-tight text-foreground">{signal.title}</h1>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
              {signal.body || "(no body text — link post)"}
            </p>
          </div>

          <a
            href={signal.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-2 inline-flex w-fit items-center gap-2 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-[1px] group-hover:translate-x-[1px]" />
            <span className="border-b border-transparent pb-[1px] tracking-widest uppercase group-hover:border-foreground">
              {formatViewOnLabel(signal.source.type)}
            </span>
          </a>
        </article>

        <div className="my-2 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

        {signal.replied ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full border border-accent/50 bg-accent/10">
              <CheckCircle2 className="size-6 text-accent" />
            </div>
            <h2 className="text-lg font-medium text-foreground">Replied</h2>
            <p className="font-mono text-xs text-muted-foreground">
              {signal.repliedAt && formatRelativeTime(signal.repliedAt)}
            </p>
            {signal.repliedPostUrl && (
              <a
                href={signal.repliedPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-accent hover:text-foreground"
              >
                View your reply →
              </a>
            )}
          </div>
        ) : (
          <Suspense fallback={<ReplyDraftSkeleton />}>
            <ReplyDraftSection projectId={projectId} signalId={signal.id} userId={session.user.id} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
