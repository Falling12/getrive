import { decodeHtmlEntities, stripHtmlToText } from "@/lib/html-text";
import { isSemanticallyRelevant } from "@/lib/ai/embedding-relevance";

// Phase 1 backfill search (AGENTS.md 1B) counterpart to
// fetch-stackexchange.ts's poll-mode /questions fetch — hits /search/advanced
// instead, which supports free-text (q=) and tag (tagged=) queries plus a
// server-side date range, so unlike Reddit's search this can ask the API
// for exactly the trailing-90-day window instead of filtering client-side.
const SE_API_BASE = "https://api.stackexchange.com/2.3";
const SE_SEARCH_PAGE_SIZE = 50;

interface StackExchangeSearchQuestion {
  question_id: number;
  title: string;
  body?: string;
  tags?: string[];
  link: string;
  owner?: { display_name?: string };
  creation_date: number;
  answer_count: number;
  // SE's own "has a good answer" flag — true when at least one answer is
  // either accepted or has a score of 2+. Not literally "has an accepted
  // answer" (that's `accepted_answer_id`, which /search/advanced's default
  // fields don't expose), but the closest available proxy for the
  // reply-worthiness rule in Phase 2B ("skip if resolved").
  is_answered: boolean;
  closed_date?: number;
}

interface StackExchangeSearchResponse {
  items?: StackExchangeSearchQuestion[];
  quota_remaining?: number;
  backoff?: number;
  error_id?: number;
  error_message?: string;
}

export interface RawStackExchangeSearchMatch {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  createdAt: Date;
  venue: string; // SE site slug, lowercased
  answerCount: number;
  hasAcceptedAnswer: boolean;
  threadState: "open" | "closed";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One request per (site, query) pair — same one-request-per-site constraint
// as fetch-stackexchange.ts, just against /search/advanced instead of
// /questions. `tag` and `text` are mutually exclusive per call (a
// PLATFORM_IDIOMATIC query variant searches by tag; LITERAL/COLLOQUIAL
// variants search by free text) — pass whichever the query variant needs.
export async function searchStackExchangeSite({
  site,
  text,
  tag,
  sinceDate,
}: {
  site: string;
  text?: string;
  tag?: string;
  sinceDate: Date;
}): Promise<{ matches: RawStackExchangeSearchMatch[]; quotaRemaining?: number }> {
  const params = new URLSearchParams({
    order: "desc",
    sort: "creation",
    site: site.toLowerCase(),
    pagesize: String(SE_SEARCH_PAGE_SIZE),
    filter: "withbody",
    fromdate: String(Math.floor(sinceDate.getTime() / 1000)),
  });
  if (text) params.set("q", text);
  if (tag) params.set("tagged", tag);
  if (process.env.STACKEXCHANGE_APP_KEY) {
    params.set("key", process.env.STACKEXCHANGE_APP_KEY);
  }

  const response = await fetch(`${SE_API_BASE}/search/advanced?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Stack Exchange search failed for site "${site}": HTTP ${response.status}`);
  }

  const data = (await response.json()) as StackExchangeSearchResponse;
  if (data.error_id) {
    throw new Error(`Stack Exchange search API error for site "${site}": ${data.error_message ?? data.error_id}`);
  }

  const matches = (data.items ?? []).map((question) => {
    const tagLine = question.tags?.length ? `\n\nTags: ${question.tags.join(", ")}` : "";
    return {
      id: String(question.question_id),
      title: decodeHtmlEntities(question.title),
      selftext: (question.body ? stripHtmlToText(question.body) : "") + tagLine,
      author: question.owner?.display_name ?? "unknown",
      permalink: question.link,
      createdAt: new Date(question.creation_date * 1000),
      venue: site.toLowerCase(),
      answerCount: question.answer_count,
      hasAcceptedAnswer: question.is_answered,
      threadState: question.closed_date ? ("closed" as const) : ("open" as const),
    };
  });

  // Embedding-similarity backstop, mirroring search-reddit.ts's — same
  // layered-filter idea (a fast first-pass filter, embeddings on top of
  // it), but SE has no separate client-side keyword backstop the way
  // Reddit's isRelevantMatch is: /search/advanced's own server-side text/
  // tag matching already plays that role, so this runs on every item SE's
  // API returns rather than a pre-filtered subset. Runs in parallel, not
  // sequentially like Reddit's per-candidate loop, since there's no
  // ordering dependency and a single query can return up to
  // SE_SEARCH_PAGE_SIZE items. Degrades to "keep the match" on any
  // embedding failure — same reasoning as Reddit: an unrelated API error
  // shouldn't make otherwise-valid results disappear, especially since this
  // is the only relevance filter SE search has.
  const queryText = text ?? tag ?? "";
  const isRelevant = await Promise.all(
    matches.map(async (match) => {
      try {
        return await isSemanticallyRelevant(queryText, `${match.title} ${match.selftext}`);
      } catch (error) {
        console.error(`[search-stackexchange] embedding relevance check failed for site "${site}"`, error);
        return true;
      }
    })
  );
  const relevantMatches = matches.filter((_, index) => isRelevant[index]);

  // Same backoff/quota discipline as fetch-stackexchange.ts — the caller
  // (backfill-search.service.ts) reads quotaRemaining back to decide whether
  // to keep spending this product's/run's SE budget.
  if (typeof data.backoff === "number" && data.backoff > 0) {
    await sleep(data.backoff * 1000);
  }

  return { matches: relevantMatches, quotaRemaining: data.quota_remaining };
}
