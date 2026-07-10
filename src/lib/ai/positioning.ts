import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";

// Array bounds here are deliberately looser than the product's actual target
// counts (exactly 3 statements, 2-3 ICPs, ~4-6 phrases) — Anthropic's tool
// calling doesn't hard-enforce JSON Schema array length the way a strict
// validator would, so a model that's off by one produces a NoObjectGeneratedError
// on a hard `.length(3)`/`.max(6)` (confirmed empirically). Generous bounds
// here + defensive slicing to the target count in generatePositioning below
// gets the same product behavior without the call failing outright on a
// harmless miscount.
const icpSchema = z.object({
  name: z
    .string()
    .describe('A short label for this ICP, e.g. "Solo indie hackers shipping B2B SaaS".'),
  reasoning: z
    .string()
    .describe(
      "2-3 sentences on why this is a strong-fit, high-intent customer segment for this specific " +
        "product — not just an audience that happens to be adjacent."
    ),
  audienceLanguage: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe(
      "4-6 short first-person phrases THIS audience actually uses to describe this exact pain " +
        "point — the kind of language that would show up verbatim in a real Reddit post, tweet, or " +
        "forum comment. Not marketing copy, not generic complaints."
    ),
});

const positioningSchema = z.object({
  statementCandidates: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe(
      "3 candidate one-line positioning statements for the product — each a single punchy sentence, " +
        "meaningfully different in angle from the others (not just reworded)."
    ),
  recommendedStatementIndex: z
    .number()
    .int()
    .min(0)
    .describe(
      "0-based index into statementCandidates of the single strongest statement — the one you'd " +
        "tell the founder to just go with if they don't want to deliberate."
    ),
  icpCandidates: z
    .array(icpSchema)
    .min(2)
    .max(4)
    .describe("2-3 candidate ideal-customer-profile segments, ordered strongest-fit first."),
  recommendedIcpIndex: z
    .number()
    .int()
    .min(0)
    .describe("0-based index into icpCandidates of the single strongest, highest-intent ICP."),
  recommendationReason: z
    .string()
    .describe(
      "1-2 sentences, addressed to the founder, on why this specific statement+ICP pairing is the " +
        "strongest combination for this product — not a generic restatement of both."
    ),
});

const TARGET_STATEMENT_COUNT = 3;
const MAX_ICP_COUNT = 3;
const MAX_AUDIENCE_LANGUAGE_COUNT = 6;

export interface IcpCandidate {
  name: string;
  reasoning: string;
  audienceLanguage: string[];
}

export interface PositioningResult {
  statementCandidates: string[];
  recommendedStatementIndex: number;
  icpCandidates: IcpCandidate[];
  recommendedIcpIndex: number;
  recommendationReason: string;
}

// Guards against the recommended index pointing past the end after the
// defensive slice below (or the model returning a stray out-of-range value)
// — falls back to the first item rather than letting an invalid index reach
// the UI.
function clampIndex(index: number, length: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= length) return 0;
  return index;
}

export async function generatePositioning({
  productName,
  description,
  targetCustomer,
}: {
  productName: string;
  description: string;
  targetCustomer?: string | null;
}): Promise<PositioningResult> {
  const { object } = await generateObject({
    model: getModel("positioningGeneration"),
    schema: positioningSchema,
    temperature: 0.5,
    prompt: [
      "A founder is onboarding to Getrive, a tool that finds people already expressing the exact",
      "pain point a product solves — across Reddit and (soon) other channels — so the founder can",
      "reach out authentically instead of cold-pitching.",
      "",
      "Product name: " + productName,
      "Product description: " + description,
      targetCustomer ? "Founder's own note on target customer: " + targetCustomer : null,
      "",
      "Generate 3 candidate one-line positioning statements, meaningfully different in angle from",
      "each other (e.g. one leads with the pain avoided, one with the outcome gained, one with who",
      "it's for) — not just paraphrases of the same idea.",
      "",
      "Then generate 2-3 candidate ICPs (ideal customer profiles). For each, reason specifically",
      "about whether this segment is a strong-fit, HIGH-INTENT match — people who would feel this pain",
      "acutely and be actively looking for a solution — not just a broad audience that's thematically",
      "adjacent. For each ICP, also produce the actual first-person language that audience uses when",
      "describing this pain point in their own words, specific enough that it would plausibly show up",
      "verbatim in something they'd post online.",
      "",
      "Finally, commit to a single recommendation: which one statement and which one ICP you'd pick",
      "for this founder if they wanted to skip deliberating entirely, and a short reason why that",
      "pairing specifically is the strongest one.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const statementCandidates = object.statementCandidates.slice(0, TARGET_STATEMENT_COUNT);
  const icpCandidates = object.icpCandidates.slice(0, MAX_ICP_COUNT).map((icp) => ({
    ...icp,
    audienceLanguage: icp.audienceLanguage.slice(0, MAX_AUDIENCE_LANGUAGE_COUNT),
  }));

  return {
    statementCandidates,
    recommendedStatementIndex: clampIndex(object.recommendedStatementIndex, statementCandidates.length),
    icpCandidates,
    recommendedIcpIndex: clampIndex(object.recommendedIcpIndex, icpCandidates.length),
    recommendationReason: object.recommendationReason,
  };
}
