"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isUnlimitedAccount } from "@/lib/limits";
import { MAX_ACTIVE_QUERIES_PER_PLATFORM } from "@/lib/services/query-feedback.service";
import { runIngestionSweep } from "@/lib/services/ingestion-run.service";
import { addDiscoveredSourceAction } from "@/app/(app)/projects/[projectId]/sources/actions";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import type { SearchPlatform, QueryVariantType } from "@/generated/prisma/client";

// Every action in this file gates on isUnlimitedAccount directly — the
// underlying service functions (query-generation/backfill-search/
// search-ingestion/venue-mining) already re-check
// assertSearchPipelineGate, but these are new CRUD actions that sit above
// that gate (adding/activating/dismissing a query or venue recommendation
// isn't itself a pipeline entry point), so they need their own explicit
// check — defense in depth, same reasoning as
// search-pipeline-gate.service.ts's own comment.
function requireAllowlisted(email: string | null | undefined): string | null {
  return isUnlimitedAccount(email) ? null : "Not found.";
}

export type QueryActionState = { error?: string; success?: boolean };

// Manual query add mirrors addRedditSourceAction's create-then-cap-check
// shape (sources/actions.ts) — same "the cap error names the exact number"
// UX, applied to SearchQuery's per-platform ACTIVE cap instead of Source's
// selected-count cap.
export async function addManualQueryAction(
  projectId: string,
  input: { platform: SearchPlatform; text: string; variantType: QueryVariantType }
): Promise<QueryActionState> {
  const session = await requireSession();
  const gateError = requireAllowlisted(session.user.email);
  if (gateError) return { error: gateError };

  const text = input.text.trim();
  if (!text) return { error: "Query text can't be empty." };

  const product = await prisma.product.findFirst({ where: { id: projectId, userId: session.user.id } });
  if (!product) return { error: "Project not found." };

  const activeCount = await prisma.searchQuery.count({
    where: { productId: product.id, platform: input.platform, status: "ACTIVE" },
  });
  if (activeCount >= MAX_ACTIVE_QUERIES_PER_PLATFORM) {
    return {
      error: `You've reached the ${MAX_ACTIVE_QUERIES_PER_PLATFORM}-active-query limit for ${input.platform}. Deactivate one before adding another.`,
    };
  }

  const existing = await prisma.searchQuery.findUnique({
    where: { productId_platform_text: { productId: product.id, platform: input.platform, text } },
  });
  if (existing?.status === "ACTIVE") return { error: "This exact query is already active." };

  if (existing) {
    await prisma.searchQuery.update({ where: { id: existing.id }, data: { status: "ACTIVE" } });
  } else {
    await prisma.searchQuery.create({
      data: { productId: product.id, platform: input.platform, text, variantType: input.variantType, status: "ACTIVE" },
    });
  }

  revalidatePath(`/projects/${projectId}/search`);
  return { success: true };
}

async function findOwnedQuery(queryId: string, projectId: string, userId: string) {
  return prisma.searchQuery.findFirst({
    where: { id: queryId, productId: projectId, product: { userId } },
  });
}

export async function setQueryActiveAction(
  projectId: string,
  queryId: string,
  active: boolean
): Promise<QueryActionState> {
  const session = await requireSession();
  const gateError = requireAllowlisted(session.user.email);
  if (gateError) return { error: gateError };

  const query = await findOwnedQuery(queryId, projectId, session.user.id);
  if (!query) return { error: "Query not found." };

  if (active) {
    const activeCount = await prisma.searchQuery.count({
      where: { productId: projectId, platform: query.platform, status: "ACTIVE" },
    });
    if (activeCount >= MAX_ACTIVE_QUERIES_PER_PLATFORM) {
      return {
        error: `You've reached the ${MAX_ACTIVE_QUERIES_PER_PLATFORM}-active-query limit for ${query.platform}. Deactivate one before reactivating another.`,
      };
    }
    await prisma.searchQuery.update({ where: { id: queryId }, data: { status: "ACTIVE", retiredReason: null } });
  } else {
    await prisma.searchQuery.update({
      where: { id: queryId },
      data: { status: "RETIRED", retiredReason: "Manually deactivated by founder." },
    });
  }

  revalidatePath(`/projects/${projectId}/search`);
  return { success: true };
}

export async function approveProposedQueryAction(projectId: string, queryId: string): Promise<QueryActionState> {
  const session = await requireSession();
  const gateError = requireAllowlisted(session.user.email);
  if (gateError) return { error: gateError };

  const query = await findOwnedQuery(queryId, projectId, session.user.id);
  if (!query || query.status !== "PROPOSED") return { error: "Query not found." };

  const activeCount = await prisma.searchQuery.count({
    where: { productId: projectId, platform: query.platform, status: "ACTIVE" },
  });
  if (activeCount >= MAX_ACTIVE_QUERIES_PER_PLATFORM) {
    return {
      error: `You've reached the ${MAX_ACTIVE_QUERIES_PER_PLATFORM}-active-query limit for ${query.platform}. Deactivate one before approving another.`,
    };
  }

  await prisma.searchQuery.update({ where: { id: queryId }, data: { status: "ACTIVE" } });
  await captureServerEvent(session.user.id, "search_query_variant_approved", {
    product_id: projectId,
    query_id: queryId,
    platform: query.platform,
    text: query.text,
  });

  revalidatePath(`/projects/${projectId}/search`);
  return { success: true };
}

export async function dismissProposedQueryAction(projectId: string, queryId: string): Promise<QueryActionState> {
  const session = await requireSession();
  const gateError = requireAllowlisted(session.user.email);
  if (gateError) return { error: gateError };

  const query = await findOwnedQuery(queryId, projectId, session.user.id);
  if (!query || query.status !== "PROPOSED") return { error: "Query not found." };

  await prisma.searchQuery.update({
    where: { id: queryId },
    data: { status: "RETIRED", retiredReason: "Dismissed by founder." },
  });

  revalidatePath(`/projects/${projectId}/search`);
  return { success: true };
}

// Ingestion is fast enough (no external rate limit, see
// ingestion-run.service.ts) for a plain Server Action rather than
// measurement's SSE stream — same activeIngestionStartedAt lock shape as
// activePollStartedAt/activeMeasurementStartedAt, just without needing a
// streaming route to report live progress through.
const INGESTION_STALE_MINUTES = 20;

export async function runIngestionNowAction(projectId: string): Promise<QueryActionState> {
  const session = await requireSession();
  const gateError = requireAllowlisted(session.user.email);
  if (gateError) return { error: gateError };

  const product = await prisma.product.findFirst({ where: { id: projectId, userId: session.user.id } });
  if (!product) return { error: "Project not found." };

  if (product.activeIngestionStartedAt) {
    const ageMinutes = (Date.now() - product.activeIngestionStartedAt.getTime()) / 60_000;
    if (ageMinutes < INGESTION_STALE_MINUTES) {
      return { error: "An ingestion run is already in progress for this project." };
    }
  }

  await prisma.product.update({ where: { id: product.id }, data: { activeIngestionStartedAt: new Date() } });
  try {
    await runIngestionSweep({ productId: product.id });
  } finally {
    await prisma.product.update({ where: { id: product.id }, data: { activeIngestionStartedAt: null } });
  }

  revalidatePath(`/projects/${projectId}/search`);
  revalidatePath(`/projects/${projectId}/signals`);
  return { success: true };
}

// Thin wrapper around sources/actions.ts's addDiscoveredSourceAction — both
// a venue-mining recommendation and an AI-guessed suggestion resolve to the
// exact same operation (flip an existing Source row's selected to true),
// so the shared action is reused verbatim rather than duplicated; this
// wrapper only adds the venue-mining-specific event.
export async function promoteVenueMiningSourceAction(
  projectId: string,
  candidate: { type: import("@/generated/prisma/client").SourceType; name: string; reasoning: string }
): Promise<QueryActionState> {
  const session = await requireSession();
  const gateError = requireAllowlisted(session.user.email);
  if (gateError) return { error: gateError };

  const result = await addDiscoveredSourceAction(projectId, candidate);
  if (result.error) return result;

  await captureServerEvent(session.user.id, "search_venue_promoted", {
    product_id: projectId,
    source_type: candidate.type,
    source_name: candidate.name,
  });

  revalidatePath(`/projects/${projectId}/search`);
  return { success: true };
}

export async function dismissVenueMiningCandidateAction(
  projectId: string,
  sourceId: string
): Promise<QueryActionState> {
  const session = await requireSession();
  const gateError = requireAllowlisted(session.user.email);
  if (gateError) return { error: gateError };

  const source = await prisma.source.findFirst({
    where: { id: sourceId, productId: projectId, product: { userId: session.user.id } },
  });
  if (!source) return { error: "Source not found." };

  await prisma.source.update({ where: { id: sourceId }, data: { venueMiningDismissedAt: new Date() } });

  revalidatePath(`/projects/${projectId}/search`);
  return { success: true };
}
