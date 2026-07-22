import { stripHtmlToText } from "@/lib/html-text";

// Phase 1 backfill search (AGENTS.md 1B) counterpart to
// fetch-hackernews.ts's poll-mode Ask HN/Show HN feed fetch — hits HN's
// Algolia-powered Search API instead (a separate, official HN-adjacent
// service; not the Firebase API poll.ts's fetcher uses), which supports
// free-text search (query=) and a server-side numeric date filter
// (numericFilters=created_at_i>...), the same shape search-stackexchange.ts
// already established for Stack Exchange. No documented quota/backoff
// fields on this API (unlike Stack Exchange), so there's no equivalent to
// backfill-search.service.ts's quota tracking here.
const HN_SEARCH_API_BASE = "https://hn.algolia.com/api/v1";

interface AlgoliaHnHit {
  objectID: string;
  title?: string | null;
  story_text?: string | null;
  url?: string | null;
  author?: string;
  created_at_i: number;
}

interface AlgoliaHnSearchResponse {
  hits?: AlgoliaHnHit[];
}

export interface RawHackerNewsSearchMatch {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
  venue: string;
}

// tags=story scopes results to top-level story submissions only, matching
// fetch-hackernews.ts's own scoping (Ask HN/Show HN, not comment-level
// mentions) — see that file's comment for why comment-level monitoring is
// out of scope.
export async function searchHackerNews({
  text,
  sinceDate,
}: {
  text: string;
  sinceDate: Date;
}): Promise<{ matches: RawHackerNewsSearchMatch[] }> {
  const params = new URLSearchParams({
    query: text,
    tags: "story",
    numericFilters: `created_at_i>${Math.floor(sinceDate.getTime() / 1000)}`,
  });

  const response = await fetch(`${HN_SEARCH_API_BASE}/search_by_date?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Hacker News search failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as AlgoliaHnSearchResponse;

  const matches = (data.hits ?? [])
    .filter((hit): hit is AlgoliaHnHit & { title: string } => Boolean(hit.title))
    .map((hit) => ({
      id: hit.objectID,
      title: hit.title,
      selftext: hit.story_text ? stripHtmlToText(hit.story_text) : hit.url ? `Link: ${hit.url}` : "",
      author: hit.author ?? "unknown",
      permalink: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      createdAt: new Date(hit.created_at_i * 1000),
      venue: "hackernews",
    }));

  return { matches };
}
