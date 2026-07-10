import { prisma } from "@/lib/prisma";
import type { SourceType } from "@/generated/prisma/client";
import { formatSourceChannel, formatSourceLabel } from "@/lib/sources/format";

export interface SourceAttributionEntry {
  type: SourceType;
  count: number;
}

export interface SourceAttribution {
  bySource: Map<string, SourceAttributionEntry>;
}

export interface ChannelAttributionEntry {
  key: string;
  label: string;
  count: number;
}

async function loadAttributedSignups(productId: string) {
  return prisma.signup.findMany({
    where: { productId, trackedLinkId: { not: null } },
    include: {
      trackedLink: {
        include: {
          signal: { include: { source: true } },
          lead: true,
        },
      },
    },
  });
}

type AttributedSignup = Awaited<ReturnType<typeof loadAttributedSignups>>[number];

export interface SignupChannel {
  // Grouping key for the channel-level view — every subreddit shares one
  // "source:REDDIT_SUBREDDIT" key so they collapse into a single "Reddit"
  // row rather than one row per community.
  channelKey: string;
  channelLabel: string;
  // Per-signup detail (which subreddit, which lead) for the attribution log,
  // where the extra specificity is exactly the point.
  detailLabel: string;
  sourceName: string | null;
  sourceType: SourceType | null;
}

// The one place that resolves a signup down to "what channel actually got
// this person" — a real monitored Source, an Outreach lead, or a
// manually-generated tracked link's own founder-typed utmSource. Shared by
// the per-source map, the channel breakdown, and the attribution log so
// they can't drift on what "channel" means for a given signup. Fixes a real
// bug: previously an Outreach-driven signup (trackedLink.lead set, no
// signal) fell through to a "REDDIT_SUBREDDIT" type default and rendered as
// a fake "r/{lead name}" source.
export function describeSignupChannel(signup: AttributedSignup): SignupChannel | null {
  const link = signup.trackedLink;
  if (!link) return null;

  if (link.signal?.source) {
    const { type, name } = link.signal.source;
    return {
      channelKey: `source:${type}`,
      channelLabel: formatSourceChannel(type),
      detailLabel: formatSourceLabel(type, name),
      sourceName: name,
      sourceType: type,
    };
  }

  if (link.lead) {
    return {
      channelKey: "outreach",
      channelLabel: "Outreach",
      detailLabel: `Outreach: ${link.lead.name}`,
      sourceName: null,
      sourceType: null,
    };
  }

  // A standalone link from the Tracked Link Generator, tied to neither a
  // Signal nor a Lead — grouped by whatever the founder typed into its
  // "Channel" (utmSource) field rather than assuming Reddit.
  const utmSource = link.utmSource || "direct";
  const channelLabel = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
  return {
    channelKey: `manual:${utmSource.toLowerCase()}`,
    channelLabel,
    detailLabel: link.utmCampaign ? `${channelLabel} — ${link.utmCampaign}` : channelLabel,
    sourceName: null,
    sourceType: null,
  };
}

// Per-source-name granularity (e.g. "r/SaaS" vs "r/startups" kept separate)
// — used by the Sources page to show each monitored source's own acquired
// count. Only real monitored-source-backed signups belong here; Outreach
// and manual-link signups have no Source row to attach to.
export async function getSignupsBySource(productId: string): Promise<SourceAttribution> {
  const signups = await loadAttributedSignups(productId);
  const bySource = new Map<string, SourceAttributionEntry>();

  for (const signup of signups) {
    const source = signup.trackedLink?.signal?.source;
    if (!source) continue;
    const entry = bySource.get(source.name);
    bySource.set(source.name, { type: source.type, count: (entry?.count ?? 0) + 1 });
  }

  return { bySource };
}

// Channel-level view for the Users/attribution page: every subreddit
// collapses into one "Reddit" row alongside Hacker News, Outreach, and any
// manually-generated links — this is what "which channel is actually
// working" should mean, not a flat list of individual subreddits.
export async function getSignupsByChannel(productId: string): Promise<ChannelAttributionEntry[]> {
  const signups = await loadAttributedSignups(productId);
  const byChannel = new Map<string, ChannelAttributionEntry>();

  for (const signup of signups) {
    const channel = describeSignupChannel(signup);
    if (!channel) continue;
    const existing = byChannel.get(channel.channelKey);
    byChannel.set(channel.channelKey, {
      key: channel.channelKey,
      label: channel.channelLabel,
      count: (existing?.count ?? 0) + 1,
    });
  }

  return Array.from(byChannel.values()).sort((a, b) => b.count - a.count);
}
