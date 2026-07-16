import { stripHtmlToText } from "@/lib/html-text";

// IndieHackers has no official API, and its own site has no real RSS either
// — /feed, /rss, /feed.xml on indiehackers.com just serve the client-
// rendered app shell, not machine-readable data (confirmed empirically).
// feed.indiehackers.world is a live, actively-maintained unofficial JSON
// Feed mirror run by a single third-party maintainer (github.com/pyoner),
// not IndieHackers itself — a real risk this disappears or breaks with no
// notice, more fragile than Reddit's own throttled-but-official RSS or HN's
// official public API. Failures here must be visible (thrown), never
// silently swallowed — same posture as reddit/fetch-posts.ts.
const INDIEHACKERS_FEED_URL = "https://feed.indiehackers.world/posts.json";

// The mirror appends its own promo footer (a Discord invite link plus an
// "Ads" link) to every item's content_html — not part of the original
// IndieHackers post, so it's stripped before this ever reaches
// scoring/reply generation, the same way Reddit's "submitted by" RSS footer
// is stripped in reddit/fetch-posts.ts's extractSelftext.
const FOOTER_MARKER = /<a\s+href=['"]https:\/\/discord\.gg\/[^'"]*['"][^>]*>\s*Discord Indiehackers Chat/i;

function stripFeedFooter(html: string): string {
  const match = FOOTER_MARKER.exec(html);
  if (!match) return html;
  return html
    .slice(0, match.index)
    .replace(/(<br\s*\/?>\s*)+$/i, "")
    .replace(/<p>\s*$/i, "");
}

interface JsonFeedItem {
  url: string;
  title: string;
  content_html?: string;
  date_modified: string;
  author?: { name?: string };
}

interface JsonFeed {
  items?: JsonFeedItem[];
}

export interface RawIndieHackersPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

// The feed item's own `url` is a redirect page on feed.indiehackers.world,
// not the real post — confirmed the actual indiehackers.com post always
// lives at /post/<id> using just this id (feed.indiehackers.world/post/<id>
// 301s to www.indiehackers.com/post/<id>, and indiehackers.com resolves
// that bare-id URL directly without needing the full title slug). This id
// is also the stable dedup key.
function extractId(feedUrl: string): string {
  return feedUrl.split("/").filter(Boolean).pop() ?? feedUrl;
}

export async function fetchNewIndieHackersPosts(): Promise<RawIndieHackersPost[]> {
  const response = await fetch(INDIEHACKERS_FEED_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`IndieHackers fetch failed: HTTP ${response.status}`);
  }

  const feed = (await response.json()) as JsonFeed;
  const items = feed.items ?? [];

  return items.map((item) => {
    const id = extractId(item.url);
    return {
      id,
      title: item.title,
      selftext: item.content_html ? stripHtmlToText(stripFeedFooter(item.content_html)) : "",
      author: item.author?.name ?? "unknown",
      permalink: `https://www.indiehackers.com/post/${id}`,
      createdAt: new Date(item.date_modified),
    };
  });
}
