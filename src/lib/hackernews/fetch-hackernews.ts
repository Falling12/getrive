import { stripHtmlToText } from "@/lib/html-text";

// Hacker News's public Firebase-backed API — no auth, no API key, no
// documented rate limit for reasonable use (unlike Reddit's unauthenticated
// RSS, which is throttled to ~1 request/60s per IP — see reddit/fetch-posts.ts).
// Scoped to top-level story submissions only for this pass (title + optional
// self-text), the same shape a Reddit post has; comment-level monitoring
// (someone describing a pain point mid-thread rather than in a submission)
// is a larger scope not attempted here.
const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

// How many of the newest story IDs to actually fetch details for per poll —
// bounds cost/latency; this is a shared feed (see poll.ts's hnCache), not
// something that needs to cover the entire firehose every single run since
// the cron rotates through frequently.
const STORIES_TO_CHECK = 60;

interface HnItem {
  id: number;
  type?: string;
  by?: string;
  time?: number;
  title?: string;
  text?: string;
  url?: string;
  deleted?: boolean;
  dead?: boolean;
}

export interface RawHackerNewsPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

export async function fetchNewHackerNewsStories(): Promise<RawHackerNewsPost[]> {
  const idsResponse = await fetch(`${HN_API_BASE}/newstories.json`, { cache: "no-store" });
  if (!idsResponse.ok) {
    throw new Error(`Hacker News fetch failed: HTTP ${idsResponse.status}`);
  }
  const ids = (await idsResponse.json()) as number[];

  // Individual item fetches use allSettled, not all — one dead/removed item
  // ID (HN returns null for some) shouldn't sink the whole batch the way a
  // single bad Reddit post doesn't abort that fetcher either.
  const results = await Promise.allSettled(
    ids.slice(0, STORIES_TO_CHECK).map(async (id) => {
      const response = await fetch(`${HN_API_BASE}/item/${id}.json`, { cache: "no-store" });
      if (!response.ok) return null;
      return (await response.json()) as HnItem | null;
    })
  );

  const items = results
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((item): item is HnItem => item !== null && item.type === "story" && !item.deleted && !item.dead);

  return items.map((item) => ({
    id: String(item.id),
    title: item.title ?? "",
    selftext: item.text ? stripHtmlToText(item.text) : item.url ? `Link: ${item.url}` : "",
    author: item.by ?? "unknown",
    permalink: `https://news.ycombinator.com/item?id=${item.id}`,
    createdAt: new Date((item.time ?? Date.now() / 1000) * 1000),
  }));
}
