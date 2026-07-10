"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  regeneratePositioningCandidates,
  selectPositioning,
  InvalidPositioningSelectionError,
  type PositioningCandidatesView,
} from "@/lib/services/positioning.service";

// Standalone revisit/regenerate for an already-onboarded project. Unlike
// onboarding's flow, this never touches channel discovery or monitored
// subreddits — it only updates the stored Positioning row.
export async function generateProjectPositioningAction(
  projectId: string
): Promise<PositioningCandidatesView | { error: string }> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({ where: { id: projectId, userId: session.user.id } });
  if (!product) return { error: "Project not found." };

  try {
    const result = await regeneratePositioningCandidates(product.id);
    revalidatePath(`/projects/${projectId}/positioning`);
    return result;
  } catch (error) {
    console.error("Positioning generation failed", error);
    Sentry.captureException(error, { tags: { feature: "positioning" } });
    return { error: "Couldn't generate positioning right now. Please try again." };
  }
}

export async function updateProjectPositioningAction(
  projectId: string,
  input: { selectedStatement: string; selectedIcpIndex: number }
): Promise<{ error?: string }> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({ where: { id: projectId, userId: session.user.id } });
  if (!product) return { error: "Project not found." };

  try {
    await selectPositioning({ productId: product.id, ...input });
  } catch (error) {
    if (error instanceof InvalidPositioningSelectionError) {
      return { error: error.message };
    }
    console.error("Positioning selection failed", error);
    Sentry.captureException(error, { tags: { feature: "positioning" } });
    return { error: "Couldn't save your selection — please try again." };
  }

  revalidatePath(`/projects/${projectId}/positioning`);
  return {};
}
