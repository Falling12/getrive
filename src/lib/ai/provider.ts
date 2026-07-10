import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { AI_TASK_MODELS, type AiTask } from "@/lib/ai/config";

// The only place in the app that imports a vendor SDK directly. Every AI
// call site asks for a model by task name and gets back a provider-agnostic
// `LanguageModel` (Vercel AI SDK) — swapping a task to a different
// provider/model is a one-line change in config.ts, not a rewrite here.
export function getModel(task: AiTask): LanguageModel {
  const { provider, model } = AI_TASK_MODELS[task];

  switch (provider) {
    case "anthropic":
      return anthropic(model);
    case "openai":
      return openai(model);
  }
}
