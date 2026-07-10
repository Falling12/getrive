"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateOutreachDraft } from "@/lib/ai/outreach-draft";
import { findKnownLeadMatches } from "@/lib/services/lead-dedup.service";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { isExemptFromLimits, MAX_OUTREACH_LEADS_PER_PROJECT, MAX_OUTREACH_LEADS_PER_ACCOUNT } from "@/lib/limits";
import { countAccountOutreachLeads } from "@/lib/account-limits";

async function loadOwnedLead(leadId: string, userId: string) {
  return prisma.lead.findFirstOrThrow({
    where: { id: leadId, product: { userId } },
    include: { product: { include: { positioning: true } } },
  });
}

export type AddLeadState = { error?: string; success?: boolean; warnings?: string[] };

// Dedup is intentionally advisory, not blocking (see lead-dedup.service.ts) —
// the lead is created either way, and any matches come back alongside
// success so the UI can surface a warning without an extra round trip.
export async function addLeadAction(
  projectId: string,
  _prevState: AddLeadState,
  formData: FormData
): Promise<AddLeadState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) return { error: "Project not found." };

  const name = String(formData.get("name") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();

  if (!name) return { error: "Enter the lead's name." };
  if (!context) return { error: "Add a note on where you found them and why they're a fit." };

  const projectLeadCount = await prisma.lead.count({ where: { productId: product.id } });
  if (!isExemptFromLimits(session.user.email) && projectLeadCount >= MAX_OUTREACH_LEADS_PER_PROJECT) {
    return {
      error: `You've reached the ${MAX_OUTREACH_LEADS_PER_PROJECT}-lead limit for this project.`,
    };
  }

  const accountLeadCount = await countAccountOutreachLeads(session.user.id);
  if (!isExemptFromLimits(session.user.email) && accountLeadCount >= MAX_OUTREACH_LEADS_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_OUTREACH_LEADS_PER_ACCOUNT}-lead limit across your account.`,
    };
  }

  const warnings = handle ? (await findKnownLeadMatches(product.id, handle)).map((m) => m.detail) : [];

  await prisma.lead.create({
    data: { productId: product.id, name, handle: handle || null, context },
  });

  revalidatePath(`/projects/${projectId}/outreach`);
  return { success: true, warnings: warnings.length > 0 ? warnings : undefined };
}

// Used for both the first draft and every later "regenerate angle" —
// there's no meaningful difference in the underlying call, only whether
// angleHint is set.
export async function generateOutreachDraftAction(
  projectId: string,
  leadId: string
): Promise<{ message: string; toneNote: string } | { error: string }> {
  const session = await requireSession();
  const lead = await loadOwnedLead(leadId, session.user.id);

  let message: string, toneNote: string;
  try {
    ({ message, toneNote } = await generateOutreachDraft({
      productName: lead.product.name,
      productDescription: lead.product.description,
      positioningStatement: lead.product.positioning?.selectedStatement,
      icpContext: describeSelectedIcp(lead.product.positioning),
      leadName: lead.name,
      leadContext: lead.context,
      angleHint: lead.draftMessage
        ? "Write a genuinely different approach than the previous draft — vary the opening, structure, or framing substantially, not just a word swap."
        : undefined,
    }));
  } catch (error) {
    console.error("Outreach draft generation failed", error);
    Sentry.captureException(error, { tags: { feature: "outreach-draft" } });
    return { error: "Couldn't generate a draft right now. Please try again." };
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: { draftMessage: message, draftToneNote: toneNote },
  });

  revalidatePath(`/projects/${projectId}/outreach`);
  return { message, toneNote };
}

export async function markLeadSentAction(projectId: string, leadId: string) {
  const session = await requireSession();
  await loadOwnedLead(leadId, session.user.id);

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "SENT", sentAt: new Date() },
  });

  revalidatePath(`/projects/${projectId}/outreach`);
}

export async function markLeadOutcomeAction(
  projectId: string,
  leadId: string,
  outcome: "RESPONDED" | "NO_RESPONSE"
) {
  const session = await requireSession();
  await loadOwnedLead(leadId, session.user.id);

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: outcome },
  });

  revalidatePath(`/projects/${projectId}/outreach`);
}
