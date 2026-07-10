import type { Metadata } from "next";
import type { SourceType } from "@/generated/prisma/client";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSignupsBySource } from "@/lib/attribution";
import { SourceCard } from "@/components/sources/source-card";
import { AddSourceForm } from "@/components/sources/add-source-form";
import { AiDiscoveryPanel } from "@/components/sources/ai-discovery-panel";
import { formatSourceChannel, formatSourceChannelDetail } from "@/lib/sources/format";

export const metadata: Metadata = { title: "Sources — Getrive" };

const CHANNEL_ORDER: SourceType[] = ["HACKERNEWS", "REDDIT_SUBREDDIT"];

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
  });

  const sources = await prisma.source.findMany({
    where: { productId: product.id, selected: true },
    orderBy: [{ type: "asc" }, { rank: "asc" }],
  });

  const { bySource } = await getSignupsBySource(product.id);

  const karmaBuildersBySource = new Map<string, { title: string; permalink: string }[]>();
  for (const src of sources) {
    if (src.type !== "REDDIT_SUBREDDIT" || src.karmaStatus === "READY") continue;
    const posts = await prisma.scoredPost.findMany({
      where: { sourceId: src.id, passed: false, title: { not: null } },
      orderBy: { scoredAt: "desc" },
      take: 3,
    });

    karmaBuildersBySource.set(
      src.id,
      posts
        .filter((p) => p.title && p.permalink)
        .map((p) => ({ title: p.title as string, permalink: p.permalink as string }))
    );
  }

  const hasHackerNews = sources.some((s) => s.type === "HACKERNEWS");
  const grouped = CHANNEL_ORDER.map((type) => ({
    type,
    sources: sources.filter((source) => source.type === type),
  })).filter((group) => group.sources.length > 0);

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-16 md:pt-0">
      <div className="flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
        <header>
          <h1 className="text-2xl font-medium tracking-wide text-foreground">Sources</h1>
          <p className="mt-1 max-w-[68ch] font-mono text-xs leading-relaxed text-muted-foreground">
            Manage the channel mix Getrive listens on. Hacker News is broad and immediate,
            Reddit is community-specific and gated by karma.
          </p>
        </header>

        <AiDiscoveryPanel projectId={projectId} />

        <AddSourceForm projectId={projectId} hasHackerNews={hasHackerNews} />

        <section className="flex flex-col gap-6">
          {sources.length === 0 ? (
            <p className="py-16 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
              No active sources yet.
            </p>
          ) : (
            grouped.map((group) => {
              return (
                <section key={group.type} className="flex flex-col gap-4">
                  <header className="flex flex-col justify-between gap-2 border-b border-border pb-3 sm:flex-row sm:items-end">
                    <div>
                      <h2 className="text-lg font-medium text-foreground">
                        {formatSourceChannel(group.type)}
                      </h2>
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {formatSourceChannelDetail(group.type)}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                      {group.sources.length} active
                    </span>
                  </header>

                  <div className="flex flex-col gap-4">
                    {group.sources.map((src) => (
                      <SourceCard
                        key={src.id}
                        projectId={projectId}
                        id={src.id}
                        type={src.type}
                        name={src.name}
                        status={src.karmaStatus}
                        karmaThreshold={src.karmaThreshold}
                        currentKarma={src.currentKarma}
                        selfPromoNotes={src.selfPromoNotes}
                        usersAcquired={bySource.get(src.name)?.count ?? 0}
                        karmaBuilders={karmaBuildersBySource.get(src.id) ?? []}
                        lastSuccessfulPollAt={src.lastSuccessfulPollAt}
                        consecutiveFailures={src.consecutiveFailures}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
