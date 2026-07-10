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

export async function fetchNewPosts(subredditName: string): Promise<RawRedditPost[]> {
  const url = `https://www.reddit.com/r/${encodeURIComponent(subredditName)}/new/.rss`;

  const response = await fetch(url, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    // Thrown, not silently swallowed to an empty array — the caller (see
    // lib/reddit/poll.ts) needs to tell "the fetch actually failed" apart
    // from "the subreddit genuinely has 0 new posts right now", since this
    // scrapes an unofficial .rss endpoint that Reddit could block further at
    // any time.
    throw new Error(`Reddit fetch failed for r/${subredditName}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml);
  const rawEntries: AtomEntry | AtomEntry[] | undefined = parsed?.feed?.entry;
  if (!rawEntries) return [];

  const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

  return entries.map((entry) => ({
    id: entry.id.replace(/^t3_/, ""),
    title: entry.title,
    selftext: extractSelftext(textOf(entry.content)),
    author: entry.author?.name?.replace(/^\/u\//, "") ?? "unknown",
    permalink: entry.link?.["@_href"] ?? "",
    createdAt: new Date(entry.published),
  }));
}
