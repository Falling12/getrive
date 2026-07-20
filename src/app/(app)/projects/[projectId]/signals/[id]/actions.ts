"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateReply } from "@/lib/ai/reply-generation";
import { describeSelectedIcp } from "@/lib/services/positioning.service";

async function loadOwnedSignal(signalId: string, userId: string) {
  const signal = await prisma.signal.findFirstOrThrow({
    where: { id: signalId, source: { product: { userId } } },
    include: { source: { include: { product: { include: { positioning: true } } } } },
  });
  return signal;
}

export async function regenerateReplyAction(
  projectId: string,
  signalId: string
): Promise<{ reply: string; toneNote: string } | { error: string }> {
  const session = await requireSession();
  const signal = await loadOwnedSignal(signalId, session.user.id);

  let reply: string, toneNote: string;
  try {
    ({ reply, toneNote } = await generateReply({
      productName: signal.source.product.name,
      productDescription: signal.source.product.description,
      positioningStatement: signal.source.product.positioning?.selectedStatement,
      icpContext:
        describeSelectedIcp(signal.source.product.positioning) ?? signal.source.product.targetCustomer,
      sourceType: signal.source.type,
      sourceName: signal.source.name,
      postTitle: signal.title,
      postBody: signal.body,
      angleHint: signal.replyDraft
        ? "Write a genuinely different approach than the previous draft — vary the opening, structure, or framing substantially, not just a word swap."
        : undefined,
    }));
  } catch (error) {
    console.error("Reply generation failed", error);
    Sentry.captureException(error, { tags: { feature: "reply-generation" } });
    return { error: "Couldn't generate a reply right now. Please try again." };
  }

  await prisma.signal.update({
    where: { id: signal.id },
    data: { replyDraft: reply, replyToneNote: toneNote },
  });

  revalidatePath(`/projects/${projectId}/signals/${signalId}`);
  return { reply, toneNote };
}

export type MarkRepliedState = { error?: string; success?: boolean };

export async function markAsRepliedAction(
  projectId: string,
  signalId: string,
  _prevState: MarkRepliedState,
  _formData: FormData
): Promise<MarkRepliedState> {
  const session = await requireSession();
  await loadOwnedSignal(signalId, session.user.id);

  await prisma.signal.update({
    where: { id: signalId },
    data: { replied: true, repliedAt: new Date() },
  });

  revalidatePath(`/projects/${projectId}/signals/${signalId}`);
  revalidatePath(`/projects/${projectId}/home`);
  return { success: true };
}
