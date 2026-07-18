import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";

// AGENTS.md Phase 1A — turns a product's Positioning output into a QuerySet:
// phrasings to search platforms for, rather than just polling whatever's
// newest. Three variant types per platform, matching the spec's calibration
// example ("ADHD reminder app" vs "app that calls me so I take my meds" vs a
// Stack Exchange tag) — colloquial phrasings matter most since real base
// rate lives in how people actually ask, not how a positioning doc reads.
const queryItemSchema = z.object({
  text: z
    .string()
    .describe(
      "The literal search string to run against the platform's search endpoint. Keep it short — 3-6 " +
        "keywords, not a full sentence. Reddit's and Stack Exchange's search backends match short " +
        "keyword combinations well but return near-zero results for long natural-language sentences " +
        "(confirmed empirically), and unquoted single common words return mostly noise. A COLLOQUIAL " +
        "variant should still be the words a real person would use (not marketing language) — just " +
        "distilled to the key 3-6 words, e.g. \"app that calls me about meds\" rather than a full " +
        "venting sentence."
    ),
  variantType: z
    .enum(["LITERAL", "COLLOQUIAL", "PLATFORM_IDIOMATIC"])
    .describe(
      "LITERAL: phrased the way the product description/positioning would state it. COLLOQUIAL: how a " +
        "real person actually asks in public — informal, pain-first, not marketing language. " +
        "PLATFORM_IDIOMATIC: a form idiomatic to this platform (a Stack Exchange tag slug, or a Reddit-" +
        "style phrasing convention)."
    ),
});

const querySetSchema = z.object({
  redditQueries: z
    .array(queryItemSchema)
    .min(3)
    .max(10)
    .describe(
      "3-10 Reddit search queries. Mix literal, colloquial, and idiomatic phrasings — bias toward how " +
        "someone venting about this exact pain point would actually type it, not marketing copy."
    ),
  stackExchangeQueries: z
    .array(queryItemSchema)
    .min(3)
    .max(10)
    .describe(
      "3-10 Stack Exchange search queries. PLATFORM_IDIOMATIC entries here should be a plausible SE tag " +
        "slug (lowercase, hyphenated, e.g. \"time-management\") suitable for a tagged= search — only " +
        "include one if a real SE tag like that plausibly exists. LITERAL/COLLOQUIAL entries are free-text " +
        "\"which tool/app should I use for X\" style questions, matching how SE's Q&A culture actually asks."
    ),
});

export interface QueryItem {
  text: string;
  variantType: "LITERAL" | "COLLOQUIAL" | "PLATFORM_IDIOMATIC";
}

export interface QuerySet {
  redditQueries: QueryItem[];
  stackExchangeQueries: QueryItem[];
}

export async function generateQuerySet({
  productName,
  description,
  icpContext,
}: {
  productName: string;
  description: string;
  icpContext?: string | null;
}): Promise<QuerySet> {
  const { object } = await generateObject({
    model: getModel("queryGeneration"),
    schema: querySetSchema,
    temperature: 0.5,
    prompt: [
      "A founder's product needs a set of search queries to measure its real base rate across public",
      "platforms — how often people actually mention this exact pain point in the wild — and to find",
      "existing conversations worth replying to, not just whatever's newest right now.",
      "",
      "Product name: " + productName,
      "Product description: " + description,
      icpContext
        ? "Selected ICP and real audience language they use (weight this heavily for COLLOQUIAL " +
          "variants — this is how real people actually phrase the pain, not how the product describes " +
          "itself): " + icpContext
        : null,
      "",
      "Generate query sets for Reddit and Stack Exchange search. For each platform, mix three kinds of",
      "phrasing:",
      "1. LITERAL — stated the way the product description/positioning would state it.",
      "2. COLLOQUIAL — how a real person actually asks in public: informal, pain-first, specific. Prefer",
      "   this style overall — it's what actually surfaces in search, not marketing language.",
      "3. PLATFORM_IDIOMATIC — a form idiomatic to that platform (a real-sounding Stack Exchange tag for",
      "   SE, a Reddit-style phrasing convention for Reddit).",
      "",
      "Every query must be specific enough to plausibly find someone with this exact pain point, not so",
      "broad it would match unrelated content. Do not force a query variant that doesn't genuinely fit —",
      "fewer, sharper queries are better than hitting the count ceiling with filler.",
      "",
      "Keep every query text SHORT: 3-6 keywords, never a full sentence — this is a search-engine query,",
      "not a quote. Distill the colloquial phrasing down to its most distinctive, specific keyword combo.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
