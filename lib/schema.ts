import { z } from "zod";

// Contract for the answer sent to the browser.
export const TriageResultSchema = z.object({
  category: z.enum(["billing", "technical_bug", "account", "feature_request"]),
  priority: z.enum(["low", "medium", "high"]),
  summary: z.string().min(1).max(300),
  suggested_action: z.string().min(1).max(300),
}).strict();

// Validate browser input before it reaches the LLM.
export const TriageTicketSchema = z.object({
  subject: z.string().trim().max(500),
  body: z.string().trim().min(1).max(5000),
}).strict();

// Sent to Chat Completions so a compatible model is constrained to this shape.
export const TriageJsonSchema = {
  type: "object",
  properties: {
    category: { type: "string", enum: ["billing", "technical_bug", "account", "feature_request"] },
    priority: { type: "string", enum: ["low", "medium", "high"] },
    summary: { type: "string" },
    suggested_action: { type: "string" },
  },
  required: ["category", "priority", "summary", "suggested_action"],
  additionalProperties: false,
} as const;

export type TriageResult = z.infer<typeof TriageResultSchema>;
