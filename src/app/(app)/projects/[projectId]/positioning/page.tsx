import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PositioningManager } from "@/components/positioning/positioning-manager";
import { isPositioningStale, type IcpCandidate } from "@/lib/services/positioning.service";

export const metadata: Metadata = { title: "Positioning — Getrive" };

export default async function PositioningPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
    select: { description: true, targetCustomer: true },
  });

  const positioning = await prisma.positioning.findUnique({ where: { productId: projectId } });

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-24 md:pt-0">
      <div className="flex w-full max-w-4xl flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
        <header>
          <h1 className="text-2xl font-medium tracking-wide text-foreground">Positioning</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Your primary ICP sharpens Signal Scoring and feeds Outreach drafts.
          </p>
        </header>

        <PositioningManager
          projectId={projectId}
          statementCandidates={(positioning?.statementCandidates as string[] | null) ?? []}
          recommendedStatementIndex={positioning?.recommendedStatementIndex ?? 0}
          icpCandidates={(positioning?.icpCandidates as IcpCandidate[] | null) ?? []}
          recommendedIcpIndex={positioning?.recommendedIcpIndex ?? 0}
          selectedStatement={positioning?.selectedStatement ?? null}
          selectedIcpName={positioning?.selectedIcpName ?? null}
          isStale={isPositioningStale(product, positioning)}
        />
      </div>
    </div>
  );
}
