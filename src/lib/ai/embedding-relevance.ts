import { embed, cosineSimilarity } from "ai";
import { getEmbeddingModel } from "@/lib/ai/provider";

// Secondary relevance signal alongside search-reddit.ts's isRelevantMatch
// keyword backstop — catches real matches phrased differently than the
// generated query (e.g. "app that calls me so I take my meds" for a query
// like "ADHD medication reminder") that pure keyword overlap can miss.
// Not a replacement for the keyword check: callers should only run this on
// matches that already passed it, bounding cost/latency to the subset that
// already cleared the cheap filter rather than every raw candidate.
//
// Threshold is a starting point, not empirically tuned yet (no labeled
// match/non-match corpus exists to validate it against) — revisit once
// real usage surfaces cases of matches wrongly kept or dropped.
const RELEVANCE_SIMILARITY_THRESHOLD = 0.5;

// text-embedding-3-small hard-rejects inputs over 8192 tokens — confirmed
// in production against long-form Reddit posts (fan-fiction-length text
// posts, 20k+ characters) that otherwise passed the keyword backstop and
// hit this ceiling on every call, silently falling back to keyword-only
// every time (caller degrades gracefully on any embed() failure, so this
// wasn't crashing, just quietly providing zero signal for every long post).
// A rough 4 chars/token average for English puts 8192 tokens around 32k
// characters, but URLs and non-English text tokenize far less efficiently
// — truncating well under that (a backstop only needs enough of the text to
// judge topical relevance, not the full body) avoids the failure case
// entirely rather than just degrading through it.
const MAX_EMBEDDING_INPUT_CHARS = 6000;

function truncateForEmbedding(text: string): string {
  return text.length > MAX_EMBEDDING_INPUT_CHARS ? text.slice(0, MAX_EMBEDDING_INPUT_CHARS) : text;
}

// Bounds worst-case latency per call — this is a backstop callers already
// degrade gracefully on failure for, so a slow/hanging request should fail
// fast rather than exhaust the AI SDK's default retry/backoff schedule.
// Directly implicated in a production maxDuration timeout on measure-signals:
// search-reddit.ts originally ran this per-match sequentially with no
// timeout, so one slow embeddings call could stall an entire Reddit search
// query (and, transitively, the whole measurement sweep) for far longer
// than its per-product time budget accounted for.
const EMBEDDING_TIMEOUT_MS = 8_000;

export async function isSemanticallyRelevant(queryText: string, candidateText: string): Promise<boolean> {
  const model = getEmbeddingModel("matchRelevance");
  const [{ embedding: queryEmbedding }, { embedding: candidateEmbedding }] = await Promise.all([
    embed({
      model,
      value: truncateForEmbedding(queryText),
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
    }),
    embed({
      model,
      value: truncateForEmbedding(candidateText),
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS),
    }),
  ]);
  return cosineSimilarity(queryEmbedding, candidateEmbedding) >= RELEVANCE_SIMILARITY_THRESHOLD;
}
