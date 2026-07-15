"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { onboardingSchema } from "@/lib/validation/onboarding";
import { isExemptFromLimits, MAX_PROJECTS_PER_ACCOUNT, MAX_MONITORED_SOURCES_PER_ACCOUNT } from "@/lib/limits";
import { countActiveProjects, countAccountMonitoredSources } from "@/lib/account-limits";
import { discoverSources } from "@/lib/ai/source-discovery";
import { extractProductFromPageText } from "@/lib/ai/product-prefill";
import { fetchPageText, PageFetchError } from "@/lib/scraping/fetch-page";
import { UnsafeUrlError } from "@/lib/scraping/url-safety";
import type { SourceType } from "@/generated/prisma/client";
import {
  regeneratePositioningCandidates,
  selectPositioning,
  describeSelectedIcp,
  InvalidPositioningSelectionError,
  type PositioningCandidatesView,
} from "@/lib/services/positioning.service";

export interface SourceSuggestionView {
  id: string;
  type: SourceType;
  name: string;
  reasoning: string;
  priority: number;
}

export type OnboardingState =
  | { step: "form"; error?: string }
  | ({ step: "positioning"; productId: string; error?: string } & PositioningCandidatesView)
  | { step: "select"; productId: string; suggestions: SourceSuggestionView[] };

// The wizard's steps (form -> positioning -> select) share ONE
// useActionState at the top (see OnboardingWizard), because the
// positioning->select transition isn't a navigation (redirect) — it's a
// same-page step change, so the wizard's rendered step must come from the
// same state the action returns into. Each step's <form> carries a hidden
// "intent" field so this single entry point can dispatch to the right
// step's logic; a missing/unrecognized intent defaults to starting fresh.
export async function onboardingAction(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  if (formData.get("intent") === "selectPositioning") {
    return selectPositioningStep(prevState, formData);
  }
  return startOnboardingStep(formData);
}

// Step 1 of onboarding: create the product, then generate Positioning
// candidates (statement + ICP options) — this now runs BEFORE channel
// discovery, since the founder's selected ICP sharpens that prompt (see
// selectPositioningStep below).
async function startOnboardingStep(formData: FormData): Promise<OnboardingState> {
  const session = await requireSession();

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { step: "form", error: parsed.error.issues[0]?.message ?? "Check your input and try again." };
  }

  // Checked before creating the draft product / spending an AI call on
  // positioning generation — no point paying that cost for a project that
  // can't be completed anyway. countActiveProjects only counts completed
  // projects (archived or still-mid-onboarding drafts don't count), so
  // archiving an existing project always frees a slot.
  const activeProjects = await countActiveProjects(session.user.id);
  if (!isExemptFromLimits(session.user.email) && activeProjects >= MAX_PROJECTS_PER_ACCOUNT) {
    return {
      step: "form",
      error: `You've reached the ${MAX_PROJECTS_PER_ACCOUNT}-project limit for your account. Archive an existing project before starting another.`,
    };
  }

  // Always a new project. A retry after a generation failure below creates
  // another draft row rather than reusing one — harmless, since a draft
  // with no selected sources never shows up in the project switcher.
  const product = await prisma.product.create({ data: { userId: session.user.id, ...parsed.data } });

  try {
    const candidates = await regeneratePositioningCandidates(product.id);
    return { step: "positioning", productId: product.id, ...candidates };
  } catch (error) {
    console.error("Positioning generation failed", error);
    Sentry.captureException(error, { tags: { feature: "onboarding-positioning" } });
    return {
      step: "form",
      error: "Couldn't generate positioning right now. Please try again.",
    };
  }
}

// The onboarding Positioning step's "Regenerate options" action — called
// directly from the client (not tied to the step's useActionState, so
// regenerating doesn't advance/reset the wizard step).
export async function regeneratePositioningAction(
  productId: string
): Promise<PositioningCandidatesView | { error: string }> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({ where: { id: productId, userId: session.user.id } });
  if (!product) return { error: "Something went wrong — please restart onboarding." };

  try {
    return await regeneratePositioningCandidates(product.id);
  } catch (error) {
    console.error("Positioning regeneration failed", error);
    Sentry.captureException(error, { tags: { feature: "onboarding-positioning" } });
    return { error: "Couldn't regenerate positioning right now. Please try again." };
  }
}

// Confirms the founder's statement + ICP choice, then runs cross-channel
// Source Discovery. The selected ICP sharpens the plan, so Positioning must
// run before this step.
async function selectPositioningStep(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await requireSession();
  const productId = String(formData.get("productId") ?? "").trim();
  const selectedStatement = String(formData.get("selectedStatement") ?? "").trim();
  const selectedIcpIndex = Number(formData.get("selectedIcpIndex"));

  const product = await prisma.product.findFirst({ where: { id: productId, userId: session.user.id } });
  if (!product) {
    return { step: "form", error: "Something went wrong — please restart onboarding." };
  }

  const fallback =
    prevState.step === "positioning"
      ? prevState
      : {
          step: "positioning" as const,
          productId,
          statementCandidates: [],
          recommendedStatementIndex: 0,
          icpCandidates: [],
          recommendedIcpIndex: 0,
          recommendationReason: "",
        };

  if (!selectedStatement || Number.isNaN(selectedIcpIndex)) {
    return { ...fallback, error: "Pick one positioning statement and one ICP to continue." };
  }

  try {
    await selectPositioning({ productId: product.id, selectedStatement, selectedIcpIndex });
  } catch (error) {
    if (error instanceof InvalidPositioningSelectionError) {
      return { ...fallback, error: error.message };
    }
    throw error;
  }

  const positioning = await prisma.positioning.findUniqueOrThrow({ where: { productId: product.id } });

  let suggestions;
  try {
    suggestions = await discoverSources({
      productName: product.name,
      description: product.description,
      icpContext: describeSelectedIcp(positioning) ?? product.targetCustomer,
    });
  } catch (error) {
    console.error("Source discovery failed", error);
    Sentry.captureException(error, { tags: { feature: "onboarding-discovery" } });
    return {
      ...fallback,
      error: "Couldn't generate source recommendations right now. Please try again.",
    };
  }

  await prisma.$transaction([
    prisma.source.deleteMany({ where: { productId: product.id } }),
    prisma.source.createMany({
      data: suggestions.map((suggestion) => ({
        productId: product.id,
        type: suggestion.type,
        name: suggestion.name,
        reasoning: suggestion.reasoning,
        rank: suggestion.rank,
        selected: false,
        karmaStatus: suggestion.type === "HACKERNEWS" ? "READY" : "WATCH",
      })),
    }),
  ]);

  const saved = await prisma.source.findMany({
    where: { productId: product.id },
    orderBy: { rank: "asc" },
  });

  return {
    step: "select",
    productId: product.id,
    suggestions: saved.map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      reasoning: s.reasoning,
      priority: suggestions.find((suggestion) => suggestion.name === s.name)?.priority ?? 3,
    })),
  };
}

export type PrefillFromUrlState =
  | { status: "success"; name: string; description: string; targetCustomer: string }
  | { status: "error"; error: string };

// Called directly from the client (not bound to a <form> action) — the
// onboarding form's "prefill from URL" button invokes this on click and
// fills in the name/description/targetCustomer fields, still leaving the
// founder free to edit them before submitting. Optional: nothing else in
// onboarding depends on this succeeding.
export async function prefillFromUrlAction(rawUrl: string): Promise<PrefillFromUrlState> {
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
    console.error("Website prefill failed", error);
    Sentry.captureException(error, { tags: { feature: "onboarding-prefill" } });
    return { status: "error", error: "Couldn't analyze that page right now. Please fill in the form manually." };
  }
}

export type ConfirmSourcesState = { error?: string };

export async function confirmSourcesAction(
  _prevState: ConfirmSourcesState,
  formData: FormData
): Promise<ConfirmSourcesState> {
  const session = await requireSession();
  const selectedIds = formData.getAll("sourceIds").map(String);
  const productId = String(formData.get("productId") ?? "").trim();

  if (selectedIds.length === 0) {
    return { error: "Select at least one source to monitor." };
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, userId: session.user.id },
  });
  if (!product) {
    return { error: "Something went wrong — please restart onboarding." };
  }

  // Backstop for MAX_PROJECTS_PER_ACCOUNT — startOnboardingStep already
  // checked this before creating the draft, but this is the moment the
  // project actually becomes "completed" (countActiveProjects doesn't count
  // it until it has a selected source), so a second onboarding attempt
  // started in another tab before the first one finished would slip past
  // that earlier check without this.
  const activeProjects = await countActiveProjects(session.user.id);
  if (!isExemptFromLimits(session.user.email) && activeProjects >= MAX_PROJECTS_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_PROJECTS_PER_ACCOUNT}-project limit for your account. Archive an existing project before completing this one.`,
    };
  }

  // This project has no selected sources of its own yet (onboarding's
  // suggestions all start selected: false — see selectPositioningStep
  // above), so the account's current count plus what's about to be selected
  // here is the resulting total. Same standing, non-resetting cap as manual
  // "add a source" (sources/actions.ts) — onboarding a new project is just
  // another way to cross it.
  const accountMonitoredCount = await countAccountMonitoredSources(session.user.id);
  if (
    !isExemptFromLimits(session.user.email) &&
    accountMonitoredCount + selectedIds.length > MAX_MONITORED_SOURCES_PER_ACCOUNT
  ) {
    const remaining = Math.max(0, MAX_MONITORED_SOURCES_PER_ACCOUNT - accountMonitoredCount);
    return {
      error:
        remaining > 0
          ? `You can only select ${remaining} more source${remaining === 1 ? "" : "s"} — you've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Select fewer, or stop monitoring one elsewhere first.`
          : `You've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Stop monitoring one elsewhere before adding more.`,
    };
  }

  await prisma.$transaction([
    prisma.source.updateMany({
      where: { productId: product.id },
      data: { selected: false },
    }),
    prisma.source.updateMany({
      where: {
        productId: product.id,
        id: { in: selectedIds },
      },
      data: { selected: true },
    }),
  ]);

  // `?tour=1` triggers the one-time dashboard walkthrough (DashboardTour) —
  // only true on this exact redirect, never on a normal later visit to the
  // dashboard, since the page strips the param on mount. `firstscan=1` is a
  // separate one-shot signal (see AutoFirstScan) that auto-starts the first
  // "check for new posts" run — kept distinct from `tour` because Settings'
  // "Retake tour" link reuses `?tour=1` on its own and must never replay a
  // live poll.
  redirect(`/projects/${product.id}/dashboard?tour=1&firstscan=1`);
}
