import { XMLParser } from "fast-xml-parser";
import { decodeHtmlEntities } from "@/lib/html-text";

// Reddit closed self-serve OAuth app registration for new developers
// (confirmed directly: reddit.com/prefs/apps is broken, and the
// unauthenticated .json endpoints return 403 from this environment).
// Its RSS feeds are still reachable unauthenticated, but only when the
// request looks like a browser — Reddit blocks descriptive/bot-style
// User-Agent strings outright. This is a pragmatic MVP choice, not a
// long-term-guaranteed one: Reddit could tighten detection further at any
// time, so failures here should be visible (logged), not silent.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Reddit's multi-subreddit URL syntax (r/sub1+sub2+sub3) works on the .rss
// endpoint the same way it does on the site — one request returns a single
// feed interleaving new posts from every listed subreddit. This is what
// lets lib/reddit/poll.ts fetch every due subreddit in one request instead
// of one rate-limited request per subreddit (Reddit's unauthenticated RSS
// access is rate-limited to roughly one request per ~60s, globally per IP).
// Capped well under any practical URL-length concern; a run with more due
// subreddits than this just carries the rest into the next run (same
// stalest-first fairness as any other over-the-cap case).
export const MAX_SUBREDDITS_PER_BATCH = 40;

// Confirmed empirically (scripts/verify-reddit-batching.ts): a combined
// multi-subreddit feed does NOT scale its page size with subreddit count —
// every batch size from 1 to 30 came back with exactly 25 entries total,
// meaning a large batch silently starves quieter subreddits of any
// visibility (30 subreddits in one request left only 13 with a single post
// represented). Reddit's listing endpoints accept an explicit `limit` query
// param, also confirmed empirically to actually return more (100 entries at
// limit=100 vs the 25-entry default), which is the real fix — a 20-subreddit
// batch went from ~50% of subreddits shut out to 17/20 represented. 100 is
// Reddit's known historical ceiling for this param on listing endpoints; not
// verified above that here. Still not a perfect guarantee for a very quiet
// subreddit sharing a batch with very busy ones, just a much better one.
const REDDIT_RSS_LIMIT = 100;

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export interface RawRedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

interface AtomEntry {
  id: string;
  title: string;
  // The <content type="html"> element has an attribute, so with
  // ignoreAttributes: false the parser gives an object ({ "#text": ... })
  // instead of a plain string.
  content?: string | { "#text"?: string };
  published: string;
  author?: { name?: string };
  link?: { "@_href"?: string };
}

function textOf(value: string | { "#text"?: string } | undefined): string {
  if (typeof value === "string") return value;
  return value?.["#text"] ?? "";
}

// Reddit's RSS <content> is the post's HTML body plus an appended
// "submitted by ... [link] [comments]" footer. Strip the footer, strip
// remaining HTML tags, and decode entities to get plain text.
function extractSelftext(html: string): string {
  const withoutComments = html.replace(/<!--\s*SC_(OFF|ON)\s*-->/g, "");
  const submittedByIndex = withoutComments.indexOf("submitted by");
  const withoutFooter =
    submittedByIndex >= 0 ? withoutComments.slice(0, submittedByIndex) : withoutComments;

  const withoutTags = withoutFooter.replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
}

// Every entry's permalink embeds its own subreddit (/r/<name>/comments/...),
// which is how a combined multi-subreddit feed gets split back apart below.
function subredditFromPermalink(permalink: string): string | undefined {
  return permalink.match(/^https?:\/\/[^/]+\/r\/([^/]+)\//)?.[1];
}

// Fetches new posts for up to MAX_SUBREDDITS_PER_BATCH subreddits in a
// single request via Reddit's r/sub1+sub2+.../new/.rss syntax, and buckets
// the results back by subreddit name (lowercased — Reddit subreddit names
// are case-insensitive, and two different Source rows could plausibly spell
// the same subreddit differently). The returned Map always has a lowercased
// entry (possibly empty) for every name passed in, so callers should look
// up with `name.toLowerCase()`.
export async function fetchNewPostsForSubreddits(
  subredditNames: string[]
): Promise<Map<string, RawRedditPost[]>> {
  // Deduped case-insensitively — both for the request itself (no point
  // asking Reddit for the same subreddit twice) and so two differently-cased
  // callers land in the same results entry instead of one clobbering the
  // other's map key.
  const uniqueNames = [...new Map(subredditNames.map((name) => [name.toLowerCase(), name])).values()];

  const results = new Map<string, RawRedditPost[]>(uniqueNames.map((name) => [name.toLowerCase(), []]));
  if (uniqueNames.length === 0) return results;

  const combinedName = uniqueNames.map(encodeURIComponent).join("+");
  const url = `https://www.reddit.com/r/${combinedName}/new/.rss?limit=${REDDIT_RSS_LIMIT}`;

  const response = await fetch(url, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    // Thrown, not silently swallowed to empty results — the caller (see
    // lib/reddit/poll.ts) needs to tell "the fetch actually failed" apart
    // from "these subreddits genuinely have 0 new posts right now", since
    // this scrapes an unofficial .rss endpoint that Reddit could block
    // further at any time.
    throw new Error(`Reddit fetch failed for r/${combinedName}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml);
  const rawEntries: AtomEntry | AtomEntry[] | undefined = parsed?.feed?.entry;
  if (!rawEntries) return results;

  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  for (const entry of entries) {
    const permalink = entry.link?.["@_href"] ?? "";
    const slug = subredditFromPermalink(permalink);
    const key = slug?.toLowerCase();
    // Defensive, not expected in practice: a combined feed should only ever
    // contain posts from the subreddits it was asked for.
    if (!key || !results.has(key)) continue;

    results.get(key)!.push({
      id: entry.id.replace(/^t3_/, ""),
      title: entry.title,
      selftext: extractSelftext(textOf(entry.content)),
      author: entry.author?.name?.replace(/^\/u\//, "") ?? "unknown",
      permalink,
      createdAt: new Date(entry.published),
    });
  }

  return results;
}
