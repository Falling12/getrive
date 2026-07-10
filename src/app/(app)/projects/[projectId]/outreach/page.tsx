import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateLeadTrackedLink, buildTrackedUrl } from "@/lib/tracked-links";
import { AddLeadForm } from "@/components/outreach/add-lead-form";
import { LeadCard } from "@/components/outreach/lead-card";

export const metadata: Metadata = { title: "Outreach — Getrive" };

// Not-yet-sent leads first (the actual work queue), then most recently
// updated within each status — mirrors Signals' "unreplied first" ordering.
const STATUS_ORDER = ["DRAFT", "SENT", "RESPONDED", "NO_RESPONSE"] as const;

export default async function OutreachPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireSession();
  const { projectId } = await params;
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
  });

  const leads = await prisma.lead.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: "desc" },
  });

  const trackedUrlByLead = new Map<string, string | null>();
  for (const lead of leads) {
    if (!lead.draftMessage) continue;
    const link = await getOrCreateLeadTrackedLink({
      productId: product.id,
      leadId: lead.id,
      leadName: lead.name,
    });
    trackedUrlByLead.set(lead.id, buildTrackedUrl(product.websiteUrl, link));
  }

  const sorted = [...leads].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="flex w-full flex-col items-center pt-16 pb-16 md:pt-0">
      <div className="flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 md:px-8 md:pt-12">
        <header>
          <h1 className="text-2xl font-medium tracking-wide text-foreground">Outreach</h1>
          <p className="mt-1 max-w-[68ch] font-mono text-xs leading-relaxed text-muted-foreground">
            Direct, manual outreach to people you found yourself. Getrive drafts a genuine first
            message from your notes — you copy it, send it your own way, and log what happened.
          </p>
        </header>

        <AddLeadForm projectId={projectId} />

        <section className="flex flex-col gap-4">
          {sorted.length === 0 ? (
            <p className="py-16 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
              No leads yet.
            </p>
          ) : (
            sorted.map((lead) => (
              <LeadCard
                key={lead.id}
                projectId={projectId}
                lead={lead}
                trackedUrl={trackedUrlByLead.get(lead.id) ?? null}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}
