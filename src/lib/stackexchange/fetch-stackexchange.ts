import { decodeHtmlEntities, stripHtmlToText } from "@/lib/html-text";

// Stack Exchange's API is official and documented, unlike Reddit's throttled
// unauthenticated RSS or IndieHackers' third-party JSON Feed mirror — it
// reports its own rate-limit state in-band (`quota_remaining`, `backoff`)
// instead of silently failing or 403ing, so this fetcher is expected to read
// and respect those fields directly rather than guessing at a safe request
// rate (see the quota/backoff handling below).
//
// SETUP STEP: register a free app key at https://stackapps.com/apps/oauth/register
// and set STACKEXCHANGE_APP_KEY — this raises the daily quota from 300 to
// 10,000 requests. Without a key this file still works, just against the
// much smaller unauthenticated quota, which a handful of monitored sites
// polling every run will burn through quickly.
const SE_API_BASE = "https://api.stackexchange.com/2.3";
const SE_PAGE_SIZE = 20;

interface StackExchangeQuestion {
  question_id: number;
  title: string;
  body?: string;
  tags?: string[];
  link: string;
  owner?: { display_name?: string };
  creation_date: number;
}

interface StackExchangeResponse {
  items?: StackExchangeQuestion[];
  quota_remaining?: number;
  backoff?: number;
  error_id?: number;
  error_message?: string;
}

export interface RawStackExchangePost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One request per site — unlike Reddit's r/sub1+sub2 syntax, the Stack
// Exchange API has no way to combine multiple sites into a single query, so
// a run monitoring several sites costs one request per site. Deliberately
// sequential (not Promise.all) so a `backoff` returned by one response can
// be honored before the next request fires, and so `quota_remaining`
// hitting 0 stops the run before it wastes further sites' requests on calls
// that would just get rejected.
export async function fetchNewQuestionsForSites(
  siteSlugs: string[]
): Promise<Map<string, RawStackExchangePost[]>> {
  const uniqueSlugs = [...new Set(siteSlugs.map((slug) => slug.toLowerCase()))];
  const results = new Map<string, RawStackExchangePost[]>(uniqueSlugs.map((slug) => [slug, []]));

  for (const site of uniqueSlugs) {
    const params = new URLSearchParams({
      order: "desc",
      sort: "creation",
      site,
      pagesize: String(SE_PAGE_SIZE),
      filter: "withbody",
    });
    if (process.env.STACKEXCHANGE_APP_KEY) {
      params.set("key", process.env.STACKEXCHANGE_APP_KEY);
    }

    const response = await fetch(`${SE_API_BASE}/questions?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Stack Exchange fetch failed for site "${site}": HTTP ${response.status}`);
    }

    const data = (await response.json()) as StackExchangeResponse;
    if (data.error_id) {
      throw new Error(`Stack Exchange API error for site "${site}": ${data.error_message ?? data.error_id}`);
    }

    results.set(
      site,
      (data.items ?? []).map((question) => {
        const tagLine = question.tags?.length ? `\n\nTags: ${question.tags.join(", ")}` : "";
        return {
          id: String(question.question_id),
          title: decodeHtmlEntities(question.title),
          selftext: (question.body ? stripHtmlToText(question.body) : "") + tagLine,
          author: question.owner?.display_name ?? "unknown",
          permalink: question.link,
          createdAt: new Date(question.creation_date * 1000),
        };
      })
    );

    // Both fields are only present when relevant (`backoff` when the API
    // wants breathing room, `quota_remaining` always but only actionable
    // near 0) — checked after every response, not just the last, since a
    // multi-site run could exhaust quota partway through.
    if (typeof data.quota_remaining === "number" && data.quota_remaining <= 0) {
      console.warn(
        `[stackexchange] quota_remaining hit 0 after site "${site}" — stopping remaining sites this run`
      );
      break;
    }
    if (typeof data.backoff === "number" && data.backoff > 0) {
      await sleep(data.backoff * 1000);
    }
  }

  return results;
}
