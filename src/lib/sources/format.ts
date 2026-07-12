import type { SourceType } from "@/generated/prisma/client";

// Shared by Signal Scoring and Reply Generation prompts, and anywhere the UI
// needs a human label for a source — one place so "how do we refer to a
// source of this type" never drifts between call sites.
export function formatSourceLabel(type: SourceType, name: string): string {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return `r/${name}`;
    case "HACKERNEWS":
      return "Hacker News";
  }
}

export function formatSourceChannel(type: SourceType): string {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return "Reddit";
    case "HACKERNEWS":
      return "Hacker News";
  }
}

export function formatSourceChannelDetail(type: SourceType): string {
  switch (type) {
    case "REDDIT_SUBREDDIT":
      return "Community-specific listening — mind each subreddit's self-promo rules when you reply.";
    case "HACKERNEWS":
      return "One public feed, no access gate, high technical density.";
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
  }
}
