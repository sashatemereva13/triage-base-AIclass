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

