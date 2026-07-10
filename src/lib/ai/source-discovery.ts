import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import type { SourceType } from "@/generated/prisma/client";

const redditSuggestionSchema = z.object({
  name: z
    .string()
    .describe("Subreddit name without the r/ prefix or quotes, e.g. \"SaaS\" or \"smallbusiness\"."),
  reasoning: z
    .string()
    .describe(
      "2-3 sentences on why this specific community contains real, high-intent potential customers " +
        "expressing this exact pain point — not just other founders or marketers discussing the topic."
    ),
});

const sourceDiscoverySchema = z.object({
  hackerNewsReasoning: z
    .string()
    .describe(
      "2-3 sentences on whether Hacker News should be activated early for this product, including the access-barrier reasoning."
    ),
  hackerNewsPriority: z.number().int().min(1).max(3),
  redditPriority: z.number().int().min(1).max(3),
  redditReasoning: z
    .string()
    .describe(
      "2-3 sentences explaining Reddit's role in the channel plan, including whether it needs karma-building first."
    ),
  redditSources: z.array(redditSuggestionSchema).min(3).max(6),
  twitterPriority: z.number().int().min(1).max(3),
  twitterReasoning: z
    .string()
    .describe(
      "2-3 sentences on whether Twitter/X would be useful for this ICP, explicitly noting it requires API/access setup before Getrive can monitor it."
    ),
});

const TARGET_REDDIT_SOURCE_COUNT = 5;

export interface SourceSuggestion {
  type: SourceType;
  name: string;
  reasoning: string;
  rank: number;
  priority: number;
  selectable: boolean;
}

export async function discoverSources({
  productName,
  description,
  icpContext,
  existingSourceNames,
}: {
  productName: string;
  description: string;
  icpContext?: string | null;
  existingSourceNames?: string[];
}): Promise<SourceSuggestion[]> {
  const { object } = await generateObject({
    model: getModel("sourceDiscovery"),
    schema: sourceDiscoverySchema,
    temperature: 0.4,
    prompt: [
      "A founder is onboarding to Getrive, a day-0 promotion tool for SaaS founders.",
      "Getrive listens across channels for people already expressing the exact pain point a product solves,",
      "scores relevance with AI, and helps the founder manually reply or reach out. It never posts for them.",
      "",
      "Product name: " + productName,
      "Product description: " + description,
      icpContext ? "Selected ICP and audience language: " + icpContext : null,
      existingSourceNames && existingSourceNames.length > 0
        ? "The founder already has these sources on their list (currently monitored or previously " +
          "suggested/dismissed) — do NOT suggest any of them again, recommend different ones: " +
          existingSourceNames.join(", ")
        : null,
      "",
      "Create a prioritized cross-channel activation plan using ONLY these channel families:",
      "1. Hacker News — one shared public feed, zero access barrier, already implementable.",
      "2. Reddit — specific subreddits, implementable, but some communities require karma-building first.",
      "3. Twitter/X — useful for some ICPs, but requires API/access setup and is NOT implementable yet.",
      "",
      "Return Hacker News as a first-class channel with priority/reasoning, then recommend 3-6 specific",
      "subreddits, and include a Twitter/X planning note. Do not over-index on founder communities unless",
      "the selected ICP really is founders. Prefer channels where the actual buyer feels the pain in public.",
      "Rank priority 1 as the best place to start, 2 as next, 3 as later/setup-dependent.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const excludedNames = new Set((existingSourceNames ?? []).map((name) => name.toLowerCase()));
  const redditSources = object.redditSources
    .filter((source) => !excludedNames.has(source.name.toLowerCase()))
    .slice(0, TARGET_REDDIT_SOURCE_COUNT);
  const suggestions: SourceSuggestion[] = [
    {
      type: "HACKERNEWS",
      name: "Hacker News",
      reasoning: object.hackerNewsReasoning,
      rank: 0,
      priority: object.hackerNewsPriority,
      selectable: true,
    },
    ...redditSources.map((source, index) => ({
      type: "REDDIT_SUBREDDIT" as const,
      name: source.name,
      reasoning: source.reasoning,
      rank: index + 1,
      priority: object.redditPriority,
      selectable: true,
    })),
    {
      type: "TWITTER_SEARCH",
      name: "Twitter/X",
      reasoning: object.twitterReasoning,
      rank: redditSources.length + 1,
      priority: object.twitterPriority,
      selectable: false,
    },
  ];

  return suggestions.sort((a, b) => a.priority - b.priority || a.rank - b.rank);
}
