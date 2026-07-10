"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { productDetailsSchema } from "@/lib/validation/settings";

export type ProductDetailsState = { error?: string; success?: boolean };

export async function updateProductDetailsAction(
  projectId: string,
  _prevState: ProductDetailsState,
  formData: FormData
): Promise<ProductDetailsState> {
  const session = await requireSession();

  const parsed = productDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  const { count } = await prisma.product.updateMany({
    where: { id: projectId, userId: session.user.id },
    data: parsed.data,
  });
  if (count === 0) {
    return { error: "Something went wrong — please refresh and try again." };
  }

  revalidatePath(`/projects/${projectId}/settings`);
  return { success: true };
}

// Archive, not delete — there's no project-deletion feature yet. Archiving
// just drops the project out of the switcher/picker (see the archivedAt
// filter added to the three project-listing queries) while keeping every
// row (signals, subreddits, tracked links) intact. Redirects to /projects,
// which resolves to the right place on its own (another project's
// dashboard if exactly one is left, onboarding if none, the picker
// otherwise).
export async function archiveProjectAction(projectId: string): Promise<void> {
  const session = await requireSession();

  await prisma.product.updateMany({
    where: { id: projectId, userId: session.user.id },
    data: { archivedAt: new Date() },
  });

  redirect("/projects");
}

export async function unarchiveProjectAction(projectId: string): Promise<void> {
  const session = await requireSession();

  await prisma.product.updateMany({
    where: { id: projectId, userId: session.user.id },
    data: { archivedAt: null },
  });

  revalidatePath(`/projects/${projectId}/settings`);
}
