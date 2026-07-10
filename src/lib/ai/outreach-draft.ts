import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";

const outreachDraftSchema = z.object({
  message: z
    .string()
    .describe(
      "The cold outreach message itself, ready to paste into a DM or email — the message body only, " +
        "no subject line, no greeting placeholder like [Name]."
    ),
  toneNote: z
    .string()
    .describe("1-2 sentences explaining the phrasing/tone choices made for this specific lead."),
});

export interface OutreachDraftResult {
  message: string;
  toneNote: string;
}

// Unlike Signal replies (a reply to an existing post, so the post itself
// anchors tone), Outreach is a cold first contact with a real named person
// the founder found manually — there's no post to react to, so genuine
// specificity has to come entirely from whatever context the founder pasted.
export async function generateOutreachDraft({
  productName,
  productDescription,
  positioningStatement,
  icpContext,
  leadName,
  leadContext,
  angleHint,
}: {
  productName: string;
  productDescription: string;
  positioningStatement?: string | null;
  icpContext?: string | null;
  leadName: string;
  leadContext: string;
  angleHint?: string;
}): Promise<OutreachDraftResult> {
  const { object } = await generateObject({
    model: getModel("outreachDraft"),
    schema: outreachDraftSchema,
    prompt: [
      "You are helping a founder write a genuine, personalized cold outreach message (a DM or email) to",
      "a specific real person they found manually — this is a first contact, not a reply to an existing",
      "post, so there's no surrounding thread to anchor tone to.",
      "",
      `Lead name: ${leadName}`,
      `What the founder knows about this lead (their own notes): ${leadContext}`,
      "",
      `The founder's product: ${productName} — ${productDescription}`,
      positioningStatement ? `Positioning: ${positioningStatement}` : null,
      icpContext
        ? `The founder's primary ICP, for tone calibration if this lead resembles them: ${icpContext}`
        : null,
      "",
      "Write a message that:",
      "- Opens with something specific and genuine drawn from the founder's own notes about this person —",
      "  never a generic template opener like \"I hope this finds you well\" or \"I noticed you work in...\".",
      `- Mentions ${productName} clearly but briefly — this is a real introduction, not a pitch deck.`,
      "- Stays short enough for a cold DM/email (roughly 3-5 sentences) — no headers, no bullet points,",
      "  no corporate phrasing.",
      "- Ends with a specific, low-pressure ask (a quick reply, a yes/no question) — never a vague",
      "  \"let me know if you're interested\".",
      angleHint ? `\nThe founder asked for a different angle than last time: ${angleHint}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
