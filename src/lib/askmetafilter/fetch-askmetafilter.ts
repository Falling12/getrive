import { XMLParser } from "fast-xml-parser";
import { stripHtmlToText } from "@/lib/html-text";

// Ask MetaFilter's own official RSS feed — a first-party feed like Hacker
// News's official API, not a third-party mirror like IndieHackers'. One
// combined feed across every category with no per-source filtering
// possible upstream, so this is a single shared fetch (matches Hacker
// News/IndieHackers' shape in poll.ts), not a per-community fetch like
// Reddit or Stack Exchange.
const ASK_METAFILTER_FEED_URL = "https://rss.metafilter.com/ask.rss";

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface MefiItem {
  title: string;
  description?: string;
  link: string;
  pubDate: string;
  "dc:creator"?: string;
  category?: string | string[];
}

export interface RawAskMetaFilterPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

// The permalink embeds the post's numeric MetaFilter id right after the
// domain (https://ask.metafilter.com/<id>/<slug>) — stable across slug
// edits, and used as the dedup key the same way IndieHackers' fetcher
// extracts its id from the feed item's url.
function extractId(link: string): string {
  return link.match(/ask\.metafilter\.com\/(\d+)\//)?.[1] ?? link;
}

export async function fetchNewAskMetaFilterPosts(): Promise<RawAskMetaFilterPost[]> {
  const response = await fetch(ASK_METAFILTER_FEED_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Ask MetaFilter fetch failed: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parsed = xmlParser.parse(xml);
  const rawItems: MefiItem | MefiItem[] | undefined = parsed?.rss?.channel?.item;
  if (!rawItems) return [];

  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.map((item) => {
    const id = extractId(item.link);
    const categories = item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [];
    const tagLine = categories.length ? `\n\nTags: ${categories.join(", ")}` : "";
    return {
      id,
      title: item.title,
      selftext: (item.description ? stripHtmlToText(item.description) : "") + tagLine,
      author: item["dc:creator"] ?? "unknown",
      permalink: item.link,
      createdAt: new Date(item.pubDate),
    };
  });
}
