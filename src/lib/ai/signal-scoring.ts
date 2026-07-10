import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { formatSourceLabel } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

// Fully static — never interpolated. OpenAI caches automatically on an
// identical prefix once a prompt crosses ~1024 tokens, so keeping this exact
// string as the `system` message (sent first, byte-for-byte the same on
// every single call across every product) is what makes that caching kick
// in. The variable part (product description + the post itself) goes in the
// user message, after this. Deliberately source-agnostic ("a post", not
// "a Reddit post") now that this scores Hacker News stories too.
const RELEVANCE_CRITERIA_SYSTEM_PROMPT = `You are a strict relevance classifier for Getrive, a tool that helps startup founders find posts — on Reddit, Hacker News, or other channels — where someone is already expressing the exact pain point their product solves, so the founder can reply authentically instead of cold-posting.

Given a product description and a single post, judge how precisely this post expresses that SPECIFIC pain point, from the poster's own current, first-hand experience — not a hypothetical, not someone else's problem, and not a generic post that merely happens to sit in a related space (e.g. general startup/founder chatter, unrelated advice-seeking, celebratory updates, or "AMA"-style posts).

Score using the full 0.0-1.0 continuum. Do not default to round numbers like 0, 0.5, or 1.0 out of habit — two posts that are both roughly "somewhat relevant" should usually still get different scores depending on how specific and first-hand the match is. Use this as rough calibration, including the space between these bands, not just the nearest anchor:
- 0.85-1.0: the poster is describing, right now, in their own words, almost exactly the pain point the product solves — reads like a real potential customer mid-problem.
- 0.55-0.85: genuinely about that pain point and the poster sounds like a plausible customer, but less direct — part of a broader complaint, missing specificity, or slightly adjacent framing.
- 0.25-0.55: same general topic, audience, or community as the product, but this particular post is not really about the pain point itself — e.g. adjacent startup/business chatter or a different problem entirely.
- 0.0-0.25: unrelated, or about building/marketing products in the abstract rather than personally experiencing the pain point.

Be strict and skeptical by default — most posts, even in an on-topic community, are NOT a strong match. Sharing a community, an audience ("founders", "developers"), or a loose thematic vibe is not enough; the post must be about THIS pain point specifically. Do not inflate the score because a post shares keywords or a general founder/builder tone with the product description.

Watch for the single most common false positive: a poster describing a pain point that THEIR OWN product or business solves for ITS customers — a launch announcement, a "would anyone find this useful?" post, a build-in-public update, a "here's what I shipped" post (this is especially common on Hacker News submissions and indie/founder subreddits alike). These always mention some pain point (that's the poster's own pitch), which makes them look like a match on a surface read, but they are not — the poster is a fellow builder, not a potential customer, unless they separately and explicitly describe personally struggling with the target product's specific pain point themselves. Score this pattern low (generally under 0.35) even when it's well-written and in the right community. The one exception: if the post is itself a direct ask for help with the target pain point (e.g. explicitly asking how to solve it), that can still score high — the distinction is whether the poster is presenting themselves as having the problem, not just adjacent to it.

Write one specific sentence explaining the score, grounded in what the post actually says.`;

const scoreSchema = z.object({
  relevanceScore: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "A precise decimal reflecting genuine judgment, not a rounded checkpoint like 0, 0.5, or 1."
    ),
  reason: z.string(),
});

export interface SignalScoringResult {
  relevanceScore: number;
  reason: string;
}

export async function scorePost({
  productDescription,
  sourceType,
  sourceName,
  postTitle,
  postBody,
  icpContext,
}: {
  productDescription: string;
  sourceType: SourceType;
  sourceName: string;
  postTitle: string;
  postBody: string;
  // From Positioning (see lib/services/positioning.service.ts's
  // describeSelectedIcp) — sharpens judgment toward the founder's chosen ICP
  // once one has been selected. Goes in the variable user prompt, never the
  // system prompt, to preserve the static-prefix prompt caching described
  // above. Optional: posts score fine without it, just less precisely.
  icpContext?: string | null;
}): Promise<SignalScoringResult> {
  const { object } = await generateObject({
    model: getModel("signalScoring"),
    schema: scoreSchema,
    system: RELEVANCE_CRITERIA_SYSTEM_PROMPT,
    prompt: [
      "Product description: " + productDescription,
      icpContext ? "Primary target customer (weigh matches to this segment more highly): " + icpContext : null,
      "",
      "Source: " + formatSourceLabel(sourceType, sourceName),
      "Post title: " + postTitle,
      "Post body: " + (postBody || "(no body text)"),
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
