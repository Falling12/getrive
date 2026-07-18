import { prisma } from "@/lib/prisma";
import { formatSourceLabel } from "@/lib/sources/format";
import { assertSearchPipelineGate } from "@/lib/services/search-pipeline-gate.service";
import type { SourceType } from "@/generated/prisma/client";

// AGENTS.md Phase 3A — proposes new sources to monitor from real evidence
// instead of an LLM's guess. lib/services/search-ingestion.service.ts
// (Phase 2A/2B) already auto-creates a `selected: false` Source row per
// distinct venue a search match landed in, and scores every match through
// the same Signal Scoring gate as polled posts — this just reads those
// results back out and surfaces the venues that actually produced real
// Signals as recommendations, via the exact same "AI discovery" UI/action
// path (components/sources/ai-discovery-panel.tsx,
// addDiscoveredSourceAction) that lib/ai/source-discovery.ts's LLM guesses
// already use, since activating either kind of suggestion is the same
// operation: flip an existing Source row's `selected` to true.
//
// A venue only surfaces here once it's actually produced real Signals, not
// just raw search matches — a subreddit with 50 matches and 0 signals is
// exactly the kind of noise Phase 1/2's precision work is meant to filter
// out, not something worth recommending as a source to actively monitor.
const MIN_SIGNALS_TO_RECOMMEND = 2;

export interface VenueMiningCandidate {
  sourceId: string;
  type: SourceType;
  name: string;
  reasoning: string;
  signalCount: number;
  matchCount: number;
}

export async function getVenueMiningCandidates(productId: string): Promise<VenueMiningCandidate[]> {
  const { allowed } = await assertSearchPipelineGate(productId, "venue-mining");
  if (!allowed) return [];

  const searchDiscoveredSources = await prisma.source.findMany({
    where: {
      productId,
      selected: false,
      discoveredViaSearch: true,
      venueMiningDismissedAt: null,
    },
    select: {
      id: true,
      type: true,
      name: true,
      scoredPosts: { select: { passed: true } },
    },
  });

  const candidates: VenueMiningCandidate[] = [];
  for (const source of searchDiscoveredSources) {
    const matchCount = source.scoredPosts.length;
    const signalCount = source.scoredPosts.filter((p) => p.passed).length;
    if (signalCount < MIN_SIGNALS_TO_RECOMMEND) continue;

    candidates.push({
      sourceId: source.id,
      type: source.type,
      name: source.name,
      reasoning:
        `Search already found real signals here. Monitoring ${formatSourceLabel(source.type, source.name)} ` +
        `directly would catch new ones as they're posted, not just what search already turned up.`,
      signalCount,
      matchCount,
    });
  }

  return candidates.sort((a, b) => b.signalCount - a.signalCount);
}
