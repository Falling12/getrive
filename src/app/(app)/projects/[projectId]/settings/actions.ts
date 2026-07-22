"use server";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { productDetailsSchema } from "@/lib/validation/settings";
import { extractProductFromPageText } from "@/lib/ai/product-prefill";
import { fetchPageText, fetchRawHtml, PageFetchError } from "@/lib/scraping/fetch-page";
import { UnsafeUrlError } from "@/lib/scraping/url-safety";
import { detectTrackingSnippets } from "@/lib/tracking-snippet";

export type ProductDetailsState = { error?: string; success?: boolean };

export type RefetchFromUrlState =
  | { status: "success"; name: string; description: string; targetCustomer: string }
  | { status: "error"; error: string };

// Mirrors onboarding/actions.ts's prefillFromUrlAction — same underlying
// fetchPageText/extractProductFromPageText utilities — so a founder can
// re-run the same website extraction any time from Settings, not just at
// onboarding, since a product's site (and its own best description of
// itself) can change well after the project was created. Stateless and
// review-before-save, same as onboarding's version: only returns the
// extracted fields for the form to show — nothing is persisted until the
// founder actually submits the form below.
export async function refetchFromUrlAction(rawUrl: string): Promise<RefetchFromUrlState> {
  await requireSession();

  const url = rawUrl.trim();
  if (!url) {
    return { status: "error", error: "Enter a URL first." };
  }

  try {
    const { title, text } = await fetchPageText(url);
    if (!text) {
      return { status: "error", error: "Couldn't read any content from that page." };
    }
    const extracted = await extractProductFromPageText({ url, pageTitle: title, pageText: text });
    return { status: "success", ...extracted };
  } catch (error) {
    if (error instanceof UnsafeUrlError || error instanceof PageFetchError) {
      return { status: "error", error: error.message };
    }
    console.error("Website refetch failed", error);
    Sentry.captureException(error, { tags: { feature: "settings-refetch" } });
    return {
      status: "error",
      error: "Couldn't analyze that page right now. Please try again or fill in the form manually.",
    };
  }
}

export type SnippetCheckState =
  | { status: "success"; captureDetected: boolean; reportDetected: boolean; checkedUrl: string }
  | { status: "error"; error: string };

// Fetches the founder's own site and greps the raw HTML for the literal
// marker strings from tracking-snippet.ts's two bodies — the most direct way
// to answer "did they actually paste this in" short of waiting for a real
// signup to arrive. The report snippet only lives on a post-signup/thank-you
// page (see TrackingSnippetCard), so reportDetected coming back false when
// checking the main site is the expected case, not a failure — the client
// frames it that way rather than as an error.
export async function checkSnippetInstallationAction(projectId: string): Promise<SnippetCheckState> {
  const session = await requireSession();

  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { websiteUrl: true },
  });
  if (!product?.websiteUrl) {
    return { status: "error", error: "Set a website URL above before checking." };
  }

  try {
    const { html, finalUrl } = await fetchRawHtml(product.websiteUrl);
    return { status: "success", ...detectTrackingSnippets(html), checkedUrl: finalUrl };
  } catch (error) {
    if (error instanceof UnsafeUrlError || error instanceof PageFetchError) {
      return { status: "error", error: error.message };
    }
    console.error("Snippet installation check failed", error);
    Sentry.captureException(error, { tags: { feature: "settings-snippet-check" } });
    return {
      status: "error",
      error: "Couldn't check your site right now. Please try again later.",
    };
  }
}

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
