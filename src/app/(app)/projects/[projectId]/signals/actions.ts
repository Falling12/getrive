"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function dismissSignalAction(projectId: string, signalId: string) {
  const session = await requireSession();

  await prisma.signal.updateMany({
    where: { id: signalId, source: { product: { userId: session.user.id } } },
    data: { dismissed: true },
  });

  revalidatePath(`/projects/${projectId}/signals`);
}

export type UpdateThresholdState = { error?: string; value?: number };

// Lives on the Signals page itself (not Project settings) — this is the
// control founders actually go looking for after seeing a promising post
// get filtered out below, so it needs to be right next to the evidence.
export async function updateRelevanceThresholdAction(
  projectId: string,
  _prevState: UpdateThresholdState,
  formData: FormData
): Promise<UpdateThresholdState> {
  const session = await requireSession();

  const raw = Number(formData.get("threshold"));
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) {
    return { error: "Threshold must be between 0 and 1." };
  }
  const value = Math.round(raw * 100) / 100;

  const { count } = await prisma.product.updateMany({
    where: { id: projectId, userId: session.user.id },
    data: { relevanceThreshold: value },
  });
  if (count === 0) {
    return { error: "Something went wrong — please refresh and try again." };
  }

  revalidatePath(`/projects/${projectId}/signals`);
  return { value };
}
