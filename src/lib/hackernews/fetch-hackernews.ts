import { stripHtmlToText } from "@/lib/html-text";

// Hacker News's public Firebase-backed API — no auth, no API key, no
// documented rate limit for reasonable use (unlike Reddit's unauthenticated
// RSS, which is throttled to ~1 request/60s per IP — see reddit/fetch-posts.ts).
// Scoped to top-level story submissions only for this pass (title + optional
// self-text), the same shape a Reddit post has; comment-level monitoring
// (someone describing a pain point mid-thread rather than in a submission)
// is a larger scope not attempted here.
const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

// Ask HN and Show HN specifically, not the general /newstories.json
// firehose — confirmed empirically that the general firehose (mostly
// infra/programming/science links) topped out at a 0.3 relevance score
// against Getrive's 0.7 threshold across 393 scored posts over 3 days.
// Ask HN and Show HN are people directly asking the community for help or
// launching something and inviting feedback/discussion — categorically
// closer to the "person describing a need" signal this product is trying
// to catch than the firehose is.
const STORY_LISTS = ["askstories", "showstories"] as const;

// How many of the newest IDs to fetch details for, per list — bounds
// cost/latency; this is a shared feed (see poll.ts's hnCache), not
// something that needs to cover the entire history every single run since
// the cron rotates through frequently. Applied per list rather than to a
// combined/merged id array, since Ask HN and Show HN are much lower-volume
// than the old firehose was — merging first would let whichever list's ids
// happened to sort first crowd out the other after slicing.
const STORIES_TO_CHECK_PER_LIST = 60;

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
  const idLists = await Promise.all(
    STORY_LISTS.map(async (list) => {
      const response = await fetch(`${HN_API_BASE}/${list}.json`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Hacker News fetch failed: HTTP ${response.status} (${list})`);
      }
      return (await response.json()) as number[];
    })
  );

  // Deduped in case the same story ever surfaces in both lists — shouldn't
  // happen given HN's Ask/Show categorization, but cheap to guard against.
  const ids = Array.from(
    new Set(idLists.flatMap((list) => list.slice(0, STORIES_TO_CHECK_PER_LIST)))
  );

  // Individual item fetches use allSettled, not all — one dead/removed item
  // ID (HN returns null for some) shouldn't sink the whole batch the way a
  // single bad Reddit post doesn't abort that fetcher either.
  const results = await Promise.allSettled(
    ids.map(async (id) => {
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
