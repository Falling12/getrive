import {
  xmlParser,
  textOf,
  extractSelftext,
  subredditFromPermalink,
  BROWSER_USER_AGENT,
  type AtomEntry,
} from "@/lib/reddit/fetch-posts";
import { isSemanticallyRelevant } from "@/lib/ai/embedding-relevance";

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

// Common words carrying no distinguishing signal for relevance filtering —
// stripped from a query before checking match overlap so a query like
// "promoting my startup without getting banned" is judged on "promoting",
// "startup", "banned", not "my"/"without"/"getting", which would match
// almost any post. Exported for reuse by
// lib/services/query-feedback.service.ts's Phase 2C query-mining, which
// needs the same "strip generic words, keep the distinctive ones" logic to
// turn a passing signal's own title into a candidate query phrase.
export const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for", "with",
  "without", "about", "that", "this", "is", "are", "was", "were", "be", "been",
  "my", "your", "our", "their", "his", "her", "its", "i", "you", "we", "they",
  "it", "as", "at", "by", "from", "if", "not", "no", "do", "does", "did",
  "so", "than", "then", "just", "get", "getting", "got", "how", "what",
  "who", "which", "will", "would", "can", "could", "should",
]);

export function significantWords(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z0-9']+/g) ?? [])].filter(
    (word) => word.length >= 3 && !STOPWORDS.has(word)
  );
}

// Reddit's search.rss, run with sort=relevance (see fetchRedditSearchMatches
// for why), can still loosely/OR-match on a single shared word — confirmed
// empirically that "no audience no list to launch" still passed a
// single-word check by matching a video-game "Launch Trailer" post on the
// word "launch" alone, and "how do I get my first users" matched unrelated
// dating-advice posts on "first" alone. Requiring at least two overlapping
// significant words (or all of them, for a query left with only one after
// stopword removal) is a much stronger signal that the match is real rather
// than coincidental single-word overlap.
function isRelevantMatch(queryWords: string[], title: string, body: string): boolean {
  if (queryWords.length === 0) return true;
  const haystack = `${title} ${body}`.toLowerCase();
  const overlap = queryWords.filter((word) => new RegExp(`\\b${word}\\b`).test(haystack)).length;
  return overlap >= Math.min(2, queryWords.length);
}

// Secondary backstop on top of isRelevantMatch, only run on candidates that
// already passed it (see lib/ai/embedding-relevance.ts) — bounds the added
// AI cost/latency to the subset that already cleared the cheap keyword
// filter instead of every raw candidate. Degrades to "keep the match" on
// any embedding-call failure, since it already passed the keyword backstop
// and shouldn't be dropped just because this secondary check errored.
async function passesSemanticBackstop(query: string, title: string, body: string): Promise<boolean> {
  try {
    return await isSemanticallyRelevant(query, `${title} ${body}`);
  } catch (error) {
    console.error("[search-reddit] embedding relevance check failed, falling back to keyword match", error);
    return true;
  }
}

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
// only returns its ~100 best-matching results, so a very high-frequency
// query may undercount true trailing-window volume — acceptable for the
// base-rate signal this feeds (HIGH vs LOW is a coarse threshold, not a
// precise count) given Reddit search is the rate-constrained call this
// whole pipeline is designed around.
//
// sort=relevance (not sort=new): confirmed empirically that sort=new
// discards Reddit's own relevance ranking and returns the newest posts that
// loosely/OR-match any query word, which for generic multi-word queries is
// close to random noise (e.g. "promoting my startup without getting
// banned" returned a CPAP-machine post and a flood-conspiracy post with the
// old sort=new). sort=relevance lets Reddit's ranking — a much stronger
// signal than a hand-rolled keyword-overlap check can produce against
// Reddit's everyday-topics corpus — do the real filtering; isRelevantMatch
// above stays on as a light backstop, not the primary filter.
export async function fetchRedditSearchMatches(
  query: string,
  sinceDate: Date
): Promise<RawRedditSearchMatch[]> {
  const params = new URLSearchParams({
    q: query,
    sort: "relevance",
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
  const queryWords = significantWords(query);

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

    const title = entry.title;
    const selftext = extractSelftext(textOf(entry.content));
    if (!isRelevantMatch(queryWords, title, selftext)) continue;
    if (!(await passesSemanticBackstop(query, title, selftext))) continue;

    matches.push({
      id: entry.id.replace(/^t3_/, ""),
      title,
      selftext,
      author: entry.author?.name?.replace(/^\/u\//, "") ?? "unknown",
      permalink,
      createdAt,
      venue,
    });
  }

  return matches;
}
