"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildTrackedUrl } from "@/lib/tracked-links";

export type LogSignupState = { error?: string; success?: boolean };

export async function logSignupAction(
  projectId: string,
  _prevState: LogSignupState,
  formData: FormData
): Promise<LogSignupState> {
  const session = await requireSession();
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
  });

  const trackedLinkId = String(formData.get("trackedLinkId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  await prisma.signup.create({
    data: {
      productId: product.id,
      trackedLinkId: trackedLinkId && trackedLinkId !== "untracked" ? trackedLinkId : null,
      note: note || null,
    },
  });

  revalidatePath(`/projects/${projectId}/users`);
  return { success: true };
}

export type CreateTrackedLinkState = { error?: string; url?: string };

export async function createTrackedLinkAction(
  projectId: string,
  _prevState: CreateTrackedLinkState,
  formData: FormData
): Promise<CreateTrackedLinkState> {
  const session = await requireSession();
  const product = await prisma.product.findFirstOrThrow({
    where: { id: projectId, userId: session.user.id },
  });

  const utmSource = String(formData.get("utmSource") ?? "reddit").trim() || "reddit";
  const utmCampaign = String(formData.get("utmCampaign") ?? "").trim();

  if (!product.websiteUrl) {
    return { error: "Set a website URL in Settings before generating tracked links." };
  }

  const link = await prisma.trackedLink.create({
    data: {
      productId: product.id,
      label: utmCampaign || `${utmSource} link`,
      utmSource,
      utmCampaign: utmCampaign || null,
    },
  });

  const url = buildTrackedUrl(product.websiteUrl, link);
  revalidatePath(`/projects/${projectId}/users`);
  return { url: url ?? undefined };
}
