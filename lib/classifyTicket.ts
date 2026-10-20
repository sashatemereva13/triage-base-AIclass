import "server-only";

import { llm, llmModel } from "./llm";
import { TRIAGE_V2_SYSTEM_PROMPT } from "./promptV2";
import {
  TriageJsonSchema,
  TriageResultSchema,
  TokenUsageSchema,
} from "./schema";

export type TicketInput = {
  subject: string;
  body: string;
};

export async function classifyTicket(ticket: TicketInput, model = llmModel) {
  const completion = await llm.chat.completions.create({
    model,
    messages: [
      { role: "system", content: TRIAGE_V2_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(ticket) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "support_ticket_triage",
        strict: true,
        schema: TriageJsonSchema,
      },
    },
  });

  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error("The model returned no result.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The model returned unreadable JSON.");
  }

  const result = TriageResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("The model returned an invalid triage result.");
  }

  const rawUsage = completion.usage
    ? {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      }
    : null;
  const usage = rawUsage === null ? null : TokenUsageSchema.parse(rawUsage);

  return { result: result.data, usage };
}
