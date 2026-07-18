"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isExemptFromLimits, MAX_MONITORED_SOURCES, MAX_MONITORED_SOURCES_PER_ACCOUNT } from "@/lib/limits";
import { countAccountMonitoredSources } from "@/lib/account-limits";
import { discoverSources } from "@/lib/ai/source-discovery";
import { describeSelectedIcp } from "@/lib/services/positioning.service";
import { stackExchangeSiteDomain } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

const SUBREDDIT_NAME_PATTERN = /^[A-Za-z0-9_]{3,21}$/;
// Stack Exchange site slugs, as used in the API's `site` query param — plain
// lowercase-alphanumeric (softwarerecs, superuser, askubuntu, serverfault),
// no hyphens/dots. Locale subsites (e.g. "es.stackoverflow") aren't covered
// by this pattern; out of scope for this pass.
const STACKEXCHANGE_SITE_PATTERN = /^[a-z0-9]{2,32}$/i;
const HACKERNEWS_SOURCE_NAME = "Hacker News";
const INDIEHACKERS_SOURCE_NAME = "IndieHackers";
const ASKMETAFILTER_SOURCE_NAME = "Ask MetaFilter";

async function assertOwned(sourceId: string, userId: string) {
  await prisma.source.findFirstOrThrow({
    where: { id: sourceId, product: { userId } },
  });
}

// Soft "remove" — stops polling/scoring and frees a slot under
// MAX_MONITORED_SOURCES, but keeps its scored-post/signal history intact
// rather than deleting it, matching how an unselected onboarding suggestion
// is already treated as inactive rather than erased.
export async function unmonitorSourceAction(projectId: string, sourceId: string) {
  const session = await requireSession();
  await assertOwned(sourceId, session.user.id);

  await prisma.source.update({
    where: { id: sourceId },
    data: { selected: false },
  });

  revalidatePath(`/projects/${projectId}/sources`);
  revalidatePath(`/projects/${projectId}/signals`);
}

export type SourceDetailsState = { error?: string; success?: boolean };

// Karma fields only mean something for reddit_subreddit sources — the
// Sources page only renders this form for that type, but the action itself
// doesn't need to re-check type since a non-reddit source simply never
// submits it.
export async function updateSourceDetailsAction(
  projectId: string,
  sourceId: string,
  _prevState: SourceDetailsState,
  formData: FormData
): Promise<SourceDetailsState> {
  const session = await requireSession();
  await assertOwned(sourceId, session.user.id);

  const karmaThresholdRaw = String(formData.get("karmaThreshold") ?? "").trim();
  const currentKarmaRaw = String(formData.get("currentKarma") ?? "").trim();
  const selfPromoNotes = String(formData.get("selfPromoNotes") ?? "").trim();

  await prisma.source.update({
    where: { id: sourceId },
    data: {
      karmaThreshold: karmaThresholdRaw ? Number(karmaThresholdRaw) : null,
      currentKarma: currentKarmaRaw ? Number(currentKarmaRaw) : 0,
      selfPromoNotes: selfPromoNotes || null,
    },
  });

  revalidatePath(`/projects/${projectId}/sources`);
  return { success: true };
}

async function nextRank(productId: string): Promise<number> {
  const highestRanked = await prisma.source.findFirst({
    where: { productId },
    orderBy: { rank: "desc" },
    select: { rank: true },
  });
  return (highestRanked?.rank ?? -1) + 1;
}

export type AddSourceState = { error?: string; success?: boolean };

// Onboarding's AI discovery is a starting point, not the ceiling — a
// founder who already knows a relevant community shouldn't have to wait
// for the AI to suggest it. Added sources are monitored immediately (no
// separate "select" step, unlike onboarding's suggestions) since choosing
// to add one here already is the confirmation. The cap counts every source
// type combined (Reddit + Hacker News), not just Reddit.
export async function addRedditSourceAction(
  projectId: string,
  _prevState: AddSourceState,
  formData: FormData
): Promise<AddSourceState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) return { error: "Project not found." };

  const rawName = String(formData.get("name") ?? "").trim().replace(/^\/?r\//i, "");
  if (!SUBREDDIT_NAME_PATTERN.test(rawName)) {
    return { error: "Enter a valid subreddit name (3-21 letters, numbers, or underscores)." };
  }

  const monitoredCount = await prisma.source.count({
    where: { productId: product.id, selected: true },
  });
  if (!isExemptFromLimits(session.user.email) && monitoredCount >= MAX_MONITORED_SOURCES) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES}-source limit for this project. Stop monitoring one before adding another.`,
    };
  }

  const accountMonitoredCount = await countAccountMonitoredSources(session.user.id);
  if (!isExemptFromLimits(session.user.email) && accountMonitoredCount >= MAX_MONITORED_SOURCES_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Stop monitoring one somewhere before adding another.`,
    };
  }

  // The unique constraint is on (productId, name) regardless of `selected`,
  // so re-adding a previously stopped subreddit would otherwise 404 into a
  // misleading "already monitoring" error — check for that row explicitly
  // and re-enable it instead of creating a duplicate.
  const existing = await prisma.source.findUnique({
    where: { productId_name: { productId: product.id, name: rawName } },
  });
  if (existing?.selected) {
    return { error: `r/${rawName} is already being monitored.` };
  }

  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: { selected: true, rank: await nextRank(product.id) },
    });
  } else {
    await prisma.source.create({
      data: {
        productId: product.id,
        type: "REDDIT_SUBREDDIT",
        name: rawName,
        reasoning: "Added manually by you.",
        rank: await nextRank(product.id),
        selected: true,
      },
    });
  }

  revalidatePath(`/projects/${projectId}/sources`);
  revalidatePath(`/projects/${projectId}/signals`);
  return { success: true };
}

// Mirrors addRedditSourceAction — Stack Exchange is also monitored per
// specific community (one Source row per site slug), not a single shared
// feed, since the API has no way to combine multiple sites into one query
// (see fetch-stackexchange.ts).
export async function addStackExchangeSourceAction(
  projectId: string,
  _prevState: AddSourceState,
  formData: FormData
): Promise<AddSourceState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) return { error: "Project not found." };

  const rawSite = String(formData.get("site") ?? "").trim().toLowerCase();
  if (!STACKEXCHANGE_SITE_PATTERN.test(rawSite)) {
    return { error: "Enter a valid Stack Exchange site slug (e.g. softwarerecs, superuser, askubuntu)." };
  }

  const monitoredCount = await prisma.source.count({
    where: { productId: product.id, selected: true },
  });
  if (!isExemptFromLimits(session.user.email) && monitoredCount >= MAX_MONITORED_SOURCES) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES}-source limit for this project. Stop monitoring one before adding another.`,
    };
  }

  const accountMonitoredCount = await countAccountMonitoredSources(session.user.id);
  if (!isExemptFromLimits(session.user.email) && accountMonitoredCount >= MAX_MONITORED_SOURCES_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Stop monitoring one somewhere before adding another.`,
    };
  }

  // Same re-activate-vs-create pattern as addRedditSourceAction — the
  // unique constraint is on (productId, name) regardless of `selected`.
  const existing = await prisma.source.findUnique({
    where: { productId_name: { productId: product.id, name: rawSite } },
  });
  if (existing?.selected) {
    return { error: `${stackExchangeSiteDomain(rawSite)} is already being monitored.` };
  }

  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: { selected: true, rank: await nextRank(product.id) },
    });
  } else {
    await prisma.source.create({
      data: {
        productId: product.id,
        type: "STACKEXCHANGE",
        name: rawSite,
        reasoning: "Added manually by you.",
        rank: await nextRank(product.id),
        selected: true,
        karmaStatus: "READY",
      },
    });
  }

  revalidatePath(`/projects/${projectId}/sources`);
  revalidatePath(`/projects/${projectId}/signals`);
  return { success: true };
}

export interface DiscoveredSourceView {
  type: SourceType;
  name: string;
  reasoning: string;
  alreadyActive: boolean;
}

export type DiscoverSourcesState =
  | { status: "idle" }
  | { status: "error"; error: string }
  | { status: "results"; suggestions: DiscoveredSourceView[] };

// Reuses the same cross-channel discovery call onboarding runs, but here
// it's re-runnable any time and additive rather than a one-shot
// wipe-and-replace — a founder's audience understanding evolves past day
// zero, and re-discovery shouldn't touch sources they're already
// monitoring.
export async function discoverNewSourcesAction(projectId: string): Promise<DiscoverSourcesState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: { positioning: true },
  });
  if (!product) return { status: "error", error: "Project not found." };

  const existing = await prisma.source.findMany({
    where: { productId: product.id },
    select: { type: true, name: true, selected: true },
  });
  const existingKeys = new Set(
    existing.filter((s) => s.selected).map((s) => `${s.type}:${s.name.toLowerCase()}`)
  );

  let suggestions;
  try {
    suggestions = await discoverSources({
      productName: product.name,
      description: product.description,
      icpContext: describeSelectedIcp(product.positioning) ?? product.targetCustomer,
      existingSourceNames: existing.map((s) => s.name),
    });
  } catch (error) {
    console.error("Source discovery failed", error);
    Sentry.captureException(error, { tags: { feature: "sources-ai-discovery" } });
    return { status: "error", error: "Couldn't generate source suggestions right now. Please try again." };
  }

  return {
    status: "results",
    suggestions: suggestions.map((s) => ({
      type: s.type,
      name: s.name,
      reasoning: s.reasoning,
      alreadyActive: existingKeys.has(`${s.type}:${s.name.toLowerCase()}`),
    })),
  };
}

// Adding an individual AI suggestion mirrors addRedditSourceAction /
// enableHackerNewsAction's create-or-reactivate logic (same unique
// constraint, same cap check), but keeps the AI's actual reasoning on the
// row instead of a generic "added manually" note, since the founder is
// approving a specific recommendation, not typing a name from scratch.
export async function addDiscoveredSourceAction(
  projectId: string,
  suggestion: { type: SourceType; name: string; reasoning: string }
): Promise<AddSourceState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) return { error: "Project not found." };

  const monitoredCount = await prisma.source.count({
    where: { productId: product.id, selected: true },
  });
  if (!isExemptFromLimits(session.user.email) && monitoredCount >= MAX_MONITORED_SOURCES) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES}-source limit for this project. Stop monitoring one before adding another.`,
    };
  }

  const accountMonitoredCount = await countAccountMonitoredSources(session.user.id);
  if (!isExemptFromLimits(session.user.email) && accountMonitoredCount >= MAX_MONITORED_SOURCES_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Stop monitoring one somewhere before adding another.`,
    };
  }

  const existing = await prisma.source.findUnique({
    where: { productId_name: { productId: product.id, name: suggestion.name } },
  });
  if (existing?.selected) {
    return { error: `${suggestion.name} is already being monitored.` };
  }

  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: { selected: true, rank: await nextRank(product.id), reasoning: suggestion.reasoning },
    });
  } else {
    await prisma.source.create({
      data: {
        productId: product.id,
        type: suggestion.type,
        name: suggestion.name,
        reasoning: suggestion.reasoning,
        rank: await nextRank(product.id),
        selected: true,
        karmaStatus: suggestion.type === "REDDIT_SUBREDDIT" ? "WATCH" : "READY",
      },
    });
  }

  revalidatePath(`/projects/${projectId}/sources`);
  revalidatePath(`/projects/${projectId}/signals`);
  return { success: true };
}

// Hacker News has no per-project sub-target to type in (it's one shared
// feed, not subdivided like subreddits) — enabling it is a single action,
// not a form. Created with karmaStatus already READY since HN has no
// comparable self-promo gate to Reddit's karma system (see the Source
// model's own comment on this).
export async function enableHackerNewsAction(projectId: string): Promise<AddSourceState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) return { error: "Project not found." };

  const monitoredCount = await prisma.source.count({
    where: { productId: product.id, selected: true },
  });
  if (!isExemptFromLimits(session.user.email) && monitoredCount >= MAX_MONITORED_SOURCES) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES}-source limit for this project. Stop monitoring one before adding another.`,
    };
  }

  const accountMonitoredCount = await countAccountMonitoredSources(session.user.id);
  if (!isExemptFromLimits(session.user.email) && accountMonitoredCount >= MAX_MONITORED_SOURCES_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Stop monitoring one somewhere before adding another.`,
    };
  }

  const existing = await prisma.source.findUnique({
    where: { productId_name: { productId: product.id, name: HACKERNEWS_SOURCE_NAME } },
  });
  if (existing?.selected) {
    return { error: "Hacker News is already being monitored." };
  }

  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: { selected: true, rank: await nextRank(product.id) },
    });
  } else {
    await prisma.source.create({
      data: {
        productId: product.id,
        type: "HACKERNEWS",
        name: HACKERNEWS_SOURCE_NAME,
        reasoning: "Enabled manually by you.",
        rank: await nextRank(product.id),
        selected: true,
        karmaStatus: "READY",
      },
    });
  }

  revalidatePath(`/projects/${projectId}/sources`);
  revalidatePath(`/projects/${projectId}/signals`);
  return { success: true };
}

// Mirrors enableHackerNewsAction — IndieHackers is also one shared feed
// with no per-project sub-target, and has no karma/self-promo gate of its
// own either, so it's created READY the same way.
export async function enableIndieHackersAction(projectId: string): Promise<AddSourceState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) return { error: "Project not found." };

  const monitoredCount = await prisma.source.count({
    where: { productId: product.id, selected: true },
  });
  if (!isExemptFromLimits(session.user.email) && monitoredCount >= MAX_MONITORED_SOURCES) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES}-source limit for this project. Stop monitoring one before adding another.`,
    };
  }

  const accountMonitoredCount = await countAccountMonitoredSources(session.user.id);
  if (!isExemptFromLimits(session.user.email) && accountMonitoredCount >= MAX_MONITORED_SOURCES_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Stop monitoring one somewhere before adding another.`,
    };
  }

  const existing = await prisma.source.findUnique({
    where: { productId_name: { productId: product.id, name: INDIEHACKERS_SOURCE_NAME } },
  });
  if (existing?.selected) {
    return { error: "IndieHackers is already being monitored." };
  }

  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: { selected: true, rank: await nextRank(product.id) },
    });
  } else {
    await prisma.source.create({
      data: {
        productId: product.id,
        type: "INDIEHACKERS",
        name: INDIEHACKERS_SOURCE_NAME,
        reasoning: "Enabled manually by you.",
        rank: await nextRank(product.id),
        selected: true,
        karmaStatus: "READY",
      },
    });
  }

  revalidatePath(`/projects/${projectId}/sources`);
  revalidatePath(`/projects/${projectId}/signals`);
  return { success: true };
}

// Mirrors enableIndieHackersAction — Ask MetaFilter is also one shared feed
// with no per-project sub-target, and has no karma/self-promo gate of its
// own either, so it's created READY the same way.
export async function enableAskMetaFilterAction(projectId: string): Promise<AddSourceState> {
  const session = await requireSession();
  const product = await prisma.product.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!product) return { error: "Project not found." };

  const monitoredCount = await prisma.source.count({
    where: { productId: product.id, selected: true },
  });
  if (!isExemptFromLimits(session.user.email) && monitoredCount >= MAX_MONITORED_SOURCES) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES}-source limit for this project. Stop monitoring one before adding another.`,
    };
  }

  const accountMonitoredCount = await countAccountMonitoredSources(session.user.id);
  if (!isExemptFromLimits(session.user.email) && accountMonitoredCount >= MAX_MONITORED_SOURCES_PER_ACCOUNT) {
    return {
      error: `You've reached the ${MAX_MONITORED_SOURCES_PER_ACCOUNT}-source limit across your account. Stop monitoring one somewhere before adding another.`,
    };
  }

  const existing = await prisma.source.findUnique({
    where: { productId_name: { productId: product.id, name: ASKMETAFILTER_SOURCE_NAME } },
  });
  if (existing?.selected) {
    return { error: "Ask MetaFilter is already being monitored." };
  }

  if (existing) {
    await prisma.source.update({
      where: { id: existing.id },
      data: { selected: true, rank: await nextRank(product.id) },
    });
  } else {
    await prisma.source.create({
      data: {
        productId: product.id,
        type: "ASKMETAFILTER",
        name: ASKMETAFILTER_SOURCE_NAME,
        reasoning: "Enabled manually by you.",
        rank: await nextRank(product.id),
        selected: true,
        karmaStatus: "READY",
      },
    });
  }

  revalidatePath(`/projects/${projectId}/sources`);
  revalidatePath(`/projects/${projectId}/signals`);
  return { success: true };
}
