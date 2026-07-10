export type AiTask =
  | "positioningGeneration"
  | "sourceDiscovery"
  | "signalScoring"
  | "replyGeneration"
  | "outreachDraft"
  | "websitePrefill";

interface AiTaskModelConfig {
  provider: "anthropic" | "openai";
  model: string;
}

// One place to swap or re-benchmark a model per task, without touching the
// call sites that use it. Each task deliberately uses a different
// provider/model chosen for that task's cost/quality tradeoff — see the
// comment on each entry.
export const AI_TASK_MODELS: Record<AiTask, AiTaskModelConfig> = {
  // Onboarding (now the step BEFORE channel discovery), regeneratable later
  // from the Positioning page. Strategic reasoning that shapes every
  // downstream task (sharper Signal Scoring, channel discovery, Outreach
  // drafts) — prioritize quality over cost.
  positioningGeneration: { provider: "anthropic", model: "claude-sonnet-5" },
  // Onboarding, once per founder after Positioning. Low call volume and it
  // decides the founder's first cross-channel promotion plan — prioritize
  // reasoning quality over cost.
  sourceDiscovery: { provider: "anthropic", model: "claude-sonnet-5" },
  // Background job, called for every new post fetched from every monitored
  // source — by far the highest-volume call in the product. Pure
  // relevance classification, so use the smallest/cheapest capable model.
  signalScoring: { provider: "openai", model: "gpt-5-nano" },
  // Signal Detail, on demand. Reply quality directly determines whether the
  // product's core promise (authentic-sounding replies) holds up — most
  // worth spending on quality over cost.
  replyGeneration: { provider: "anthropic", model: "claude-sonnet-5" },
  // Outreach, on demand, once per lead (plus manual regenerates). A cold
  // first-contact message is higher-stakes per-send than a Signal reply —
  // there's no existing post to anchor tone to, so getting the opening line
  // genuinely specific to the lead matters even more. Quality over cost.
  outreachDraft: { provider: "anthropic", model: "claude-sonnet-5" },
  // Onboarding, once per founder, optional. Feeds directly into
  // sourceDiscovery's prompt (name/description/targetCustomer), so a bad
  // extraction here quietly degrades the whole rest of onboarding —
  // prioritize quality over cost, same reasoning as sourceDiscovery.
  websitePrefill: { provider: "anthropic", model: "claude-sonnet-5" },
};
