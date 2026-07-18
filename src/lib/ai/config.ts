export type AiTask =
  | "positioningGeneration"
  | "sourceDiscovery"
  | "queryGeneration"
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
  // Onboarding, once per founder after Positioning, plus any later "Discover
  // more" reruns — a recommend-only list the founder reviews before adding
  // anything, so a slightly weaker suggestion just doesn't get clicked
  // rather than silently degrading anything downstream. Downgraded from
  // Sonnet 5 to Haiku 4.5 on that basis — this is a bounded suggestion-list
  // task, not open-ended reasoning.
  sourceDiscovery: { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
  // Onboarding/base-rate re-measurement (AGENTS.md Phase 1A), once per
  // product per re-measurement, not per-post. Downgraded from Sonnet 5 to
  // Haiku 4.5: this is a bounded task (short keyword phrases + one-line
  // reasoning, not deep judgment), and AGENTS.md Phase 2C's query feedback
  // loop (query-feedback.service.ts) now backstops a weak initial query —
  // underperformers get auto-retired, and real passing signals mine better
  // replacement queries from their own phrasing. The stakes of any single
  // generation call being slightly worse are much lower than before 2C
  // existed.
  queryGeneration: { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
  // Background job, called for every new post fetched from every monitored
  // source — by far the highest-volume call in the product. Pure
  // relevance classification, so use the smallest/cheapest capable model.
  // gpt-5-nano is deprecated (OpenAI shutdown scheduled 2026-12-10) —
  // migrated proactively to its successor gpt-5.4-nano rather than waiting
  // and doing it under time pressure. ~4x pricier ($0.05/$0.40 ->
  // $0.20/$1.25 per 1M tokens) but this is still the cheapest capable tier
  // available and isn't going away.
  signalScoring: { provider: "openai", model: "gpt-5.4-nano" },
  // Signal Detail, on demand. Reply quality directly determines whether the
  // product's core promise (authentic-sounding replies) holds up — most
  // worth spending on quality over cost.
  replyGeneration: { provider: "anthropic", model: "claude-sonnet-5" },
  // Outreach, on demand, once per lead (plus manual regenerates). A cold
  // first-contact message is higher-stakes per-send than a Signal reply —
  // there's no existing post to anchor tone to, so getting the opening line
  // genuinely specific to the lead matters even more. Quality over cost.
  outreachDraft: { provider: "anthropic", model: "claude-sonnet-5" },
  // Onboarding, once per founder, optional. A mechanical extraction task
  // (pull name/description/targetCustomer out of a fetched web page) —
  // downgraded from Sonnet 5 to gpt-5.4-mini: this isn't open-ended
  // reasoning like positioningGeneration/sourceDiscovery, it's structured
  // extraction from real page content, which a mid-tier model handles fine.
  websitePrefill: { provider: "openai", model: "gpt-5.4-mini" },
};
