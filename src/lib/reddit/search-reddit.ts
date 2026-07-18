import {
  xmlParser,
  textOf,
  extractSelftext,
  subredditFromPermalink,
  BROWSER_USER_AGENT,
  type AtomEntry,
} from "@/lib/reddit/fetch-posts";

// Phase 1 backfill search (AGENTS.md 1B) — unlike fetch-posts.ts, which
// polls specific subreddits a founder has selected, this searches sitewide
// for existing mentions of a product's pain point so a "wrong venues"
// cohort (real matches, just not in a subreddit the product monitors) can
// be told apart from "genuinely rare". Reuses the same .rss + browser-UA
// approach as fetch-posts.ts since Reddit's OAuth search API isn't reachable
// without an app registration (see reddit_access_constraints in memory) —
// same structural constraint, same workaround.
//
// Reddit's unauthenticated RSS access is rate-limited to roughly one
// request per ~60s globally per IP (see fetch-posts.ts) — this function
// makes exactly one request and does not sleep internally; callers running
// many queries in sequence (lib/services/backfill-search.service.ts) are
// responsible for spacing calls out.
const REDDIT_SEARCH_LIMIT = 100;

export interface RawRedditSearchMatch {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
  venue: string; // subreddit the match landed in, lowercased
}

// Sitewide search (not restricted to a subreddit) — matches spec 1B's "Run
// each query against Reddit search API", and lets venue-mining (Phase 3A)
// discover subreddits the product isn't already polling. `sinceDate` filters
// client-side (Reddit's search.rss has no date-range param); the RSS feed
// only returns its most recent ~100 matches regardless of true match volume,
// so a very high-frequency query may undercount true trailing-window volume
// — acceptable for the base-rate signal this feeds (HIGH vs LOW is a coarse
// threshold, not a precise count) given Reddit search is the rate-constrained
// call this whole pipeline is designed around.
export async function fetchRedditSearchMatches(
  query: string,
  sinceDate: Date
): Promise<RawRedditSearchMatch[]> {
  const params = new URLSearchParams({
    q: query,
    sort: "new",
    limit: String(REDDIT_SEARCH_LIMIT),
  });
  const url = `https://www.reddit.com/search.rss?${params.toString()}`;

  const response = await fetch(url, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Reddit search fetch failed for query "${query}": HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml);
  const rawEntries: AtomEntry | AtomEntry[] | undefined = parsed?.feed?.entry;
  if (!rawEntries) return [];

  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];
  const matches: RawRedditSearchMatch[] = [];

  for (const entry of entries) {
    // Reddit's sitewide search feed can return subreddits themselves as
    // hits (id prefix "t5_", no <published>, permalink like
    // "/r/Onboarding/" with no "/comments/…") alongside actual posts
    // ("t3_") — only the latter are real matches to score against.
    if (!entry.id.startsWith("t3_")) continue;

    const permalink = entry.link?.["@_href"] ?? "";
    const venue = subredditFromPermalink(permalink)?.toLowerCase();
    const createdAt = new Date(entry.published);
    if (!venue || Number.isNaN(createdAt.getTime()) || createdAt < sinceDate) continue;

    matches.push({
      id: entry.id.replace(/^t3_/, ""),
      title: entry.title,
      selftext: extractSelftext(textOf(entry.content)),
      author: entry.author?.name?.replace(/^\/u\//, "") ?? "unknown",
      permalink,
      createdAt,
      venue,
    });
  }

  return matches;
}
