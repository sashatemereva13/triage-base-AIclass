import { z } from "zod";

// check token usage
export const TokenUsageSchema = z
  .object({
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative(),
  })
  .strict();

// Validate browser input before it reaches the LLM.
export const TriageTicketSchema = z
  .object({
    subject: z.string().trim().max(500),
    body: z.string().trim().min(1).max(5000),
  })
  .strict();

export const TriageRequestSchema = z
  .object({
    ticket: TriageTicketSchema,
    model: z.string().trim().min(1).optional(),
    engine: z.enum(["llm", "decisionRules"]).optional(),
  })
  .strict();

// Sent to Chat Completions so a compatible model is constrained to this shape.
export const TriageJsonSchema = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["billing", "technical_bug", "account", "feature_request"],
    },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string", minLength: 1, maxLength: 300 },
    suggested_action: { type: "string", minLength: 1, maxLength: 300 },
  },
  required: ["category", "priority", "summary", "suggested_action"],
  additionalProperties: false,
} as const;

// Contract for the answer sent to the browser.
export const TriageResultSchema = z
  .object({
    category: z.enum([
      "billing",
      "technical_bug",
      "account",
      "feature_request",
    ]),
    priority: z.enum(["low", "medium", "high"]),
    summary: z.string().min(1).max(300),
    suggested_action: z.string().min(1).max(300),
  })
  .strict();

export type TriageResult = z.infer<typeof TriageResultSchema>;
export type TokenUsage = z.infer<typeof TokenUsageSchema>;
