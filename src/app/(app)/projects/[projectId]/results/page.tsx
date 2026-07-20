import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSignupsByChannel, describeSignupChannel } from "@/lib/attribution";
import { parseSignupGoalTarget } from "@/lib/signup-goal";
import { WhatsWorkingCallout, ChannelBreakdown } from "@/components/users/channel-breakdown";
import { AttributionLog } from "@/components/users/attribution-log";
import { LogSignupForm } from "@/components/users/log-signup-form";
import { TrackedLinkGenerator } from "@/components/users/tracked-link-generator";

export const metadata: Metadata = { title: "Results — Getrive" };

// The outcome end of the app: the Dashboard's "primary target" hero metric
// (users acquired vs. goal) now leads this page, with the old Users page's
// attribution detail below it — Home stays about today's work, Results
// about whether it's working.
export default async function ResultsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
  });

  const [usersAcquired, breakdownRows, signups, trackedLinks] = await Promise.all([
    prisma.signup.count({ where: { productId: product.id, trackedLinkId: { not: null } } }),
    getSignupsByChannel(product.id),
    prisma.signup.findMany({
      where: { productId: product.id },
      include: {
        trackedLink: { include: { signal: { include: { source: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.trackedLink.findMany({
      where: { productId: product.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const goalTarget = parseSignupGoalTarget(product.signupGoal);
  const goalShare = goalTarget ? Math.min(100, Math.round((usersAcquired / goalTarget) * 100)) : null;

  const top = breakdownRows[0];
  const totalAttributed = breakdownRows.reduce((sum, r) => sum + r.count, 0);

  const logRows = signups.map((signup) => ({
    id: signup.id,
    channelDetail: describeSignupChannel(signup)?.detailLabel ?? null,
    note: signup.note,
    createdAt: signup.createdAt,
    source: signup.source,
  }));

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-16 md:pt-0">
      <div className="flex w-full max-w-6xl flex-col px-4 pt-8 md:px-8 md:pt-12">
        <section className="relative mb-12 flex w-full flex-col border-b-2 border-border pb-12 md:mb-14 md:pb-16">
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

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
          <div className="flex min-w-0 flex-col gap-10">
            <WhatsWorkingCallout
              topChannelLabel={top?.label ?? null}
              topCount={top?.count ?? 0}
              totalAttributed={totalAttributed}
            />
            <ChannelBreakdown rows={breakdownRows} />
            <AttributionLog rows={logRows} />
          </div>

          <aside className="flex w-full flex-col gap-6 self-start pb-12 lg:sticky lg:top-8 lg:pb-0">
            <LogSignupForm
              projectId={projectId}
              trackedLinks={trackedLinks.map((link) => ({ id: link.id, label: link.label }))}
            />
            <TrackedLinkGenerator projectId={projectId} />
          </aside>
        </div>
      </div>
    </div>
  );
}
