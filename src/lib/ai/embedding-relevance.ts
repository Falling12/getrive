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

export async function isSemanticallyRelevant(queryText: string, candidateText: string): Promise<boolean> {
  const model = getEmbeddingModel("matchRelevance");
  const [{ embedding: queryEmbedding }, { embedding: candidateEmbedding }] = await Promise.all([
    embed({ model, value: queryText }),
    embed({ model, value: candidateText }),
  ]);
  return cosineSimilarity(queryEmbedding, candidateEmbedding) >= RELEVANCE_SIMILARITY_THRESHOLD;
}
