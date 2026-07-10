import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSignupsByChannel, describeSignupChannel } from "@/lib/attribution";
import { WhatsWorkingCallout, ChannelBreakdown } from "@/components/users/channel-breakdown";
import { AttributionLog } from "@/components/users/attribution-log";
import { LogSignupForm } from "@/components/users/log-signup-form";
import { TrackedLinkGenerator } from "@/components/users/tracked-link-generator";

export const metadata: Metadata = { title: "Users — Getrive" };

export default async function UsersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
  });

  const [breakdownRows, signups, trackedLinks] = await Promise.all([
    getSignupsByChannel(product.id),
    prisma.signup.findMany({
      where: { productId: product.id },
      include: {
        trackedLink: { include: { signal: { include: { source: true } }, lead: true } },
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
        <header className="mb-10">
          <h1 className="text-2xl font-medium tracking-wide text-foreground">User attribution</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Track which signups came from Getrive-assisted replies.
          </p>
        </header>

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
