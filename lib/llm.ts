import "server-only";
import OpenAI from "openai";

function requiredEnv(name: "LLM_API_KEY" | "LLM_BASE_URL" | "LLM_MODEL") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const llm = new OpenAI({
  apiKey: requiredEnv("LLM_API_KEY"),
  baseURL: requiredEnv("LLM_BASE_URL"),
});

export const llmModel = requiredEnv("LLM_MODEL");

const configuredModels = process.env.LLM_MODELS
  ?.split(",")
  .map((model) => model.trim())
  .filter(Boolean);

export const llmModels = Array.from(new Set([llmModel, ...(configuredModels ?? [])]));

export function isSupportedModel(model: string): boolean {
  return llmModels.includes(model);
}

