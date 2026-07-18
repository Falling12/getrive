import type { SourceType } from "@/generated/prisma/client";

// Most Stack Exchange sites live at <slug>.stackexchange.com, but a handful
// of the oldest/highest-traffic ones predate that convention and have their
// own top-level domain instead — these are the ones a founder is actually
// likely to type (per the onboarding examples: softwarerecs is the regular
// pattern, superuser/askubuntu are the exceptions). Used for both the
// human-readable label and the outbound "view source" link, so a wrong
// guess here would be user-visible in two places, not just cosmetic.
const STACKEXCHANGE_DOMAIN_OVERRIDES: Record<string, string> = {
  stackoverflow: "stackoverflow.com",
  superuser: "superuser.com",
  askubuntu: "askubuntu.com",
  serverfault: "serverfault.com",
  mathoverflow: "mathoverflow.net",
};

export function stackExchangeSiteDomain(siteSlug: string): string {
  return STACKEXCHANGE_DOMAIN_OVERRIDES[siteSlug.toLowerCase()] ?? `${siteSlug}.stackexchange.com`;
}

// Shared by Signal Scoring and Reply Generation prompts, and anywhere the UI
// needs a human label for a source — one place so "how do we refer to a
// source of this type" never drifts between call sites.
export function formatSourceLabel(type: SourceType, name: string): string {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return `r/${name}`;
    case "HACKERNEWS":
      return "Hacker News";
    case "INDIEHACKERS":
      return "IndieHackers";
    case "STACKEXCHANGE":
      return stackExchangeSiteDomain(name);
    case "ASKMETAFILTER":
      return "Ask MetaFilter";
  }
}

export function formatSourceChannel(type: SourceType): string {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return "Reddit";
    case "HACKERNEWS":
      return "Hacker News";
    case "INDIEHACKERS":
      return "IndieHackers";
    case "STACKEXCHANGE":
      return "Stack Exchange";
    case "ASKMETAFILTER":
      return "Ask MetaFilter";
  }
}

export function formatSourceChannelDetail(type: SourceType): string {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return "Community-specific listening — mind each subreddit's self-promo rules when you reply.";
    case "HACKERNEWS":
      return "One public feed, no access gate, high technical density.";
    case "INDIEHACKERS":
      return "One public feed, no access gate, supportive founder-to-founder community.";
    case "STACKEXCHANGE":
      return "Per-site listening via the official API — mind each site's strict self-promotion norms when you reply.";
    case "ASKMETAFILTER":
      return "One public feed, no access gate, rewards thoughtful and personable answers over quick link-drops.";
  }
}

// Reddit's "u/username" convention doesn't apply on Hacker News — this is
// the one place that prefix gets added, so a Signal/SignalCard doesn't need
// to know per-source author conventions.
export function formatAuthorLabel(type: SourceType, author: string): string {
  return type === "REDDIT_SUBREDDIT" ? `u/${author}` : author;
}

// "View on Reddit" doesn't generalize; used by Signal Detail's outbound link.
export function formatViewOnLabel(type: SourceType): string {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return "View on Reddit";
    case "HACKERNEWS":
      return "View on Hacker News";
    case "INDIEHACKERS":
      return "View on IndieHackers";
    case "STACKEXCHANGE":
      return "View on Stack Exchange";
    case "ASKMETAFILTER":
      return "View on Ask MetaFilter";
  }
}

