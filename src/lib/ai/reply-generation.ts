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
// subreddit variation), on IndieHackers (a supportive founder-to-founder
// community where sharing your own product is expected peer generosity,
// not suspect self-promotion the way it is on HN), on Stack Exchange (an
// official Q&A network with an explicit, strictly-enforced self-promotion
// policy — answers are expected to be terse, technical, and cite the
// actual tool/library by name rather than talk around it, closer to
// documentation than conversation), or on Ask MetaFilter (a paid,
// moderated, more personal community whose culture rewards long-form,
// narrative, conversational answers over quick link-drops — closer to
// Reddit's tone than Stack Exchange's) — this is the one line of
// source-specific steering; everything else in the prompt stays shared.
function sourceGuidance(sourceType: SourceType, sourceName: string): string {
  switch (sourceType) {
    case "HACKERNEWS":
      return (
        "This is a Hacker News comment, not a Reddit reply — HN's culture is terser, more technical, " +
        "and considerably more skeptical of anything reading as self-promotion than most subreddits. " +
        "Lead with substance a technical reader would respect; keep the product mention especially " +
        "brief and factual, closer to an aside than Reddit's already-low-key standard."
      );
    case "INDIEHACKERS":
      return (
        "This is an IndieHackers comment, not a Reddit reply or an HN comment — IndieHackers' culture " +
        "is warm and founder-to-founder: most posters are building solo too, and openly sharing what " +
        "you built and why reads as generous peer support rather than self-promotion, as long as it's " +
        "genuinely tied to the poster's specific situation. Lead with real empathy for the struggle " +
        "described, and don't undersell the product mention the way HN's guidance does — a fuller, " +
        "warmer mention fits this community better than the terse HN aside or Reddit's low-key default."
      );
    case "STACKEXCHANGE":
      return (
        "This is a Stack Exchange answer, not a Reddit reply or a forum comment — Stack Exchange's " +
        "culture (and its explicit self-promotion policy) expects terse, technical, cite-the-actual-" +
        "tool answers that read as documentation, not conversation. Skip pleasantries and hedging; " +
        "lead with the concrete answer to the actual question, name the specific tool/approach plainly " +
        "rather than gesturing at it, and disclose the product connection directly and briefly rather " +
        "than working it in gradually the way a Reddit or IndieHackers reply would."
      );
    case "ASKMETAFILTER":
      return (
        "This is an Ask MetaFilter answer, not a terse Stack Exchange one — MetaFilter is a small, paid, " +
        "moderated community whose culture rewards thoughtful, personable, narrative answers over quick " +
        "link-drops, closer to Reddit's tone than Stack Exchange's. It's fine (expected, even) to write " +
        "a longer, more conversational answer that explains your reasoning and relates to the poster's " +
        "specific situation before the product mention, rather than the clipped, cite-the-tool style " +
        "that fits Stack Exchange."
      );
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
