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
