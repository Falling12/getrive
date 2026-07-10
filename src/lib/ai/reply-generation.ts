import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";
import { formatSourceLabel } from "@/lib/sources/format";
import type { SourceType } from "@/generated/prisma/client";

const replySchema = z.object({
  reply: z.string().describe("The reply text itself, ready to paste as a comment."),
  toneNote: z
    .string()
    .describe(
      "1-2 sentences explaining the phrasing/tone choices made for this specific community/source and post."
    ),
});

export interface ReplyGenerationResult {
  reply: string;
  toneNote: string;
}

// Format/tone conventions differ enough by source that "write a Reddit
// comment" instructions produce a wrong-feeling draft on Hacker News (HN
// culture reads self-promotion mentions as much more suspect, rewards
// terser and more technical phrasing, and has no concept of subreddit-by-
// subreddit variation) — this is the one line of source-specific steering;
// everything else in the prompt stays shared.
function sourceGuidance(sourceType: SourceType, sourceName: string): string {
  switch (sourceType) {
    case "HACKERNEWS":
      return (
        "This is a Hacker News comment, not a Reddit reply — HN's culture is terser, more technical, " +
        "and considerably more skeptical of anything reading as self-promotion than most subreddits. " +
        "Lead with substance a technical reader would respect; keep the product mention especially " +
        "brief and factual, closer to an aside than Reddit's already-low-key standard."
      );
    case "TWITTER_SEARCH":
      return "This is a reply to a tweet, not a Reddit comment — keep it short enough for the platform.";
    case "REDDIT_SUBREDDIT":
    default:
      return (
        `Reason first about ${formatSourceLabel(sourceType, sourceName)}'s likely culture and norms: how ` +
        "blunt or friendly it is, how it typically reacts to any hint of self-promotion, what tone reads " +
        "as genuine vs. try-hard there. Let that reasoning shape the actual wording — don't use one " +
        "generic reply style for every subreddit."
      );
  }
}

export async function generateReply({
  productName,
  productDescription,
  positioningStatement,
  icpContext,
  sourceType,
  sourceName,
  postTitle,
  postBody,
  angleHint,
}: {
  productName: string;
  productDescription: string;
  positioningStatement?: string | null;
  icpContext?: string | null;
  sourceType: SourceType;
  sourceName: string;
  postTitle: string;
  postBody: string;
  angleHint?: string;
}): Promise<ReplyGenerationResult> {
  const sourceLabel = formatSourceLabel(sourceType, sourceName);

  const { object } = await generateObject({
    model: getModel("replyGeneration"),
    schema: replySchema,
    prompt: [
      "You are helping a founder write a genuine, authentic reply to a post — not a marketing comment.",
      sourceGuidance(sourceType, sourceName),
      "",
      `The post (in ${sourceLabel}):`,
      `Title: ${postTitle}`,
      `Body: ${postBody || "(no body text)"}`,
      "",
      `The founder's product: ${productName} — ${productDescription}`,
      positioningStatement ? `Positioning: ${positioningStatement}` : null,
      icpContext
        ? `The founder's primary ICP, for tone calibration if the poster resembles them: ${icpContext}`
        : null,
      "",
      "Write a reply that:",
      "- Leads with genuine value or insight relevant to the poster's actual situation — this must not read as an ad.",
      `- MUST include one brief, honest mention of ${productName} by name, near the end. This is required, not ` +
        "optional — find the specific, genuine connection between this post and the product rather than skipping " +
        "the mention. Keep it low-key (a sentence, not a pitch) and never make it the main point of the reply.",
      `- Matches ${sourceLabel}'s tone, not a generic "helpful SaaS reply" voice.`,
      "- Is written as a real comment: no headers, no bullet lists unless that's genuinely how people write " +
        "in this community, no corporate phrasing.",
      angleHint
        ? `\nThe founder asked for a different angle than last time: ${angleHint}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
