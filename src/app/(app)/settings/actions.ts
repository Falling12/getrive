"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function updateNotificationPrefsAction(input: {
  notifyNewSignal?: boolean;
  notifyWeeklyDigest?: boolean;
}) {
  const session = await requireSession();

  await prisma.user.update({
    where: { id: session.user.id },
    data: input,
  });

  revalidatePath("/settings");
}
