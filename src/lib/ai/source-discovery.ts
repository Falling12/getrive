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

const stackExchangeSiteSuggestionSchema = z.object({
  site: z
    .string()
    .describe(
      "Stack Exchange site slug as used in its API's `site` query param, e.g. \"softwarerecs\", " +
        "\"superuser\", \"serverfault\", \"askubuntu\" — not a display name or URL."
    ),
  reasoning: z
    .string()
    .describe(
      "2-3 sentences on why this specific Stack Exchange site's askers are a real fit for this product " +
        "— site culture there expects terse, technical, cite-the-tool answers, so only suggest a site " +
        "where that framing genuinely fits the product."
    ),
});

const sourceDiscoverySchema = z.object({
  hackerNewsReasoning: z
    .string()
    .describe(
      "2-3 sentences on whether Hacker News should be activated early for this product, including the access-barrier reasoning."
    ),
  hackerNewsPriority: z.number().int().min(1).max(3),
  indieHackersReasoning: z
    .string()
    .describe(
      "2-3 sentences on whether IndieHackers should be activated early for this product. It's a supportive " +
        "founder-to-founder community, not a general audience — strongest when the ICP is itself other " +
        "founders/indie builders, much weaker fit for a product whose buyer is a non-founder consumer or enterprise."
    ),
  indieHackersPriority: z.number().int().min(1).max(3),
  askMetaFilterReasoning: z
    .string()
    .describe(
      "2-3 sentences on whether Ask MetaFilter should be activated early for this product. It's a small, " +
        "paid, moderated general-audience Q&A community that rewards thoughtful narrative answers — a " +
        "reasonable fit for consumer-facing products, weaker for narrow developer-tool products that " +
        "Stack Exchange or Hacker News cover better."
    ),
  askMetaFilterPriority: z.number().int().min(1).max(3),
  redditPriority: z.number().int().min(1).max(3),
  redditReasoning: z
    .string()
    .describe(
      "2-3 sentences explaining Reddit's role in the channel plan, including whether it needs karma-building first."
    ),
  redditSources: z.array(redditSuggestionSchema).min(3).max(6),
  stackExchangeReasoning: z
    .string()
    .describe(
      "2-3 sentences on whether Stack Exchange should be activated early for this product, and whether " +
        "any of its sites (beyond the general-purpose ones) are a genuine fit — weak/no fit for a product " +
        "with no plausible \"which tool should I use for X\" question anywhere in its network."
    ),
  stackExchangePriority: z.number().int().min(1).max(3),
  stackExchangeSites: z
    .array(stackExchangeSiteSuggestionSchema)
    .max(3)
    .describe(
      "0-3 specific Stack Exchange sites worth monitoring. Leave empty if no specific site is a real fit " +
        "— do not force a suggestion just to fill the list."
    ),
});

const TARGET_REDDIT_SOURCE_COUNT = 5;
const TARGET_STACKEXCHANGE_SITE_COUNT = 3;

export interface SourceSuggestion {
  type: SourceType;
  name: string;
  reasoning: string;
  rank: number;
  priority: number;
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
      "2. IndieHackers — one shared public feed, zero access barrier, a supportive founder-to-founder",
      "   community. Only prioritize this highly when the ICP is genuinely other founders/indie builders —",
      "   it's a weak channel for a product whose real buyer is a non-founder consumer or enterprise team.",
      "3. Reddit — specific subreddits, implementable, but some communities require karma-building first.",
      "4. Stack Exchange — an official Q&A network, implementable per-site (e.g. softwarerecs, superuser,",
      "   serverfault, askubuntu). Its culture expects terse, technical, cite-the-tool answers — a strong",
      "   fit for products with a clear \"which tool/library should I use for X\" angle, weak for anything",
      "   without one. Suggest specific sites only where that framing genuinely fits.",
      "5. Ask MetaFilter — one shared public feed, zero access barrier, a small paid general-audience",
      "   community that rewards long-form, personable answers. Reasonable for consumer-facing products,",
      "   weaker for narrow developer tooling that Stack Exchange/Hacker News already cover better.",
      "",
      "Return Hacker News, IndieHackers, and Ask MetaFilter as first-class channels with priority/reasoning",
      "each, Stack Exchange with its own priority/reasoning plus 0-3 specific site suggestions, then",
      "recommend 3-6 specific subreddits. Do not over-index on founder communities unless the selected",
      "ICP really is founders. Prefer channels where the actual buyer feels the pain in public.",
      "Rank priority 1 as the best place to start, 2 as next, 3 as later/setup-dependent.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const excludedNames = new Set((existingSourceNames ?? []).map((name) => name.toLowerCase()));
  const redditSources = object.redditSources
    .filter((source) => !excludedNames.has(source.name.toLowerCase()))
    .slice(0, TARGET_REDDIT_SOURCE_COUNT);
  const stackExchangeSites = object.stackExchangeSites
    .filter((site) => !excludedNames.has(site.site.toLowerCase()))
    .slice(0, TARGET_STACKEXCHANGE_SITE_COUNT);
  const suggestions: SourceSuggestion[] = [
    {
      type: "HACKERNEWS",
      name: "Hacker News",
      reasoning: object.hackerNewsReasoning,
      rank: 0,
      priority: object.hackerNewsPriority,
    },
    {
      type: "INDIEHACKERS",
      name: "IndieHackers",
      reasoning: object.indieHackersReasoning,
      rank: 1,
      priority: object.indieHackersPriority,
    },
    {
      type: "ASKMETAFILTER",
      name: "Ask MetaFilter",
      reasoning: object.askMetaFilterReasoning,
      rank: 2,
      priority: object.askMetaFilterPriority,
    },
    ...redditSources.map((source, index) => ({
      type: "REDDIT_SUBREDDIT" as const,
      name: source.name,
      reasoning: source.reasoning,
      rank: index + 3,
      priority: object.redditPriority,
    })),
    ...stackExchangeSites.map((site, index) => ({
      type: "STACKEXCHANGE" as const,
      name: site.site,
      reasoning: site.reasoning,
      rank: index + 3 + redditSources.length,
      priority: object.stackExchangePriority,
    })),
  ];

  return suggestions.sort((a, b) => a.priority - b.priority || a.rank - b.rank);
}
