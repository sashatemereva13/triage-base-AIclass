import OpenAI from "openai";
import { classifyTicket } from "../../../lib/classifyTicket";
import { classifyTicketWithDecisionRules, decisionRulesConfigured, decisionRulesModelName } from "../../../lib/decisionRules";
import { isSupportedModel, llmModel } from "../../../lib/llm";
import { PROMPT_VERSION } from "../../../lib/promptV2";
import { TriageRequestSchema } from "../../../lib/schema";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request. Please check the ticket fields." },
      { status: 400 },
    );
  }

  const requestBody = TriageRequestSchema.safeParse(body);
  if (!requestBody.success) {
    const details = requestBody.error.issues
      .map((issue) => {
        const field = issue.path.length > 0 ? issue.path.join(".") : "request";
        return `${field}: ${issue.message}`;
      })
      .join("; ");

    return Response.json(
      { error: `Invalid request: ${details}` },
      { status: 400 },
    );
  }

  const selectedEngine = requestBody.data.engine ?? "llm";
  const selectedModel = requestBody.data.model ?? llmModel;
  if (selectedEngine === "decisionRules" && !decisionRulesConfigured()) {
    return Response.json(
      { error: "DecisionRules is not configured. Set DECISIONRULES_API_KEY and DECISIONRULES_RULE_ID in the server environment." },
      { status: 503 },
    );
  }
  if (selectedEngine === "llm" && !isSupportedModel(selectedModel)) {
    return Response.json({ error: "Choose one of the configured LLM models." }, { status: 400 });
  }

  try {
    const classification = selectedEngine === "decisionRules"
      ? await classifyTicketWithDecisionRules(requestBody.data.ticket)
      : await classifyTicket(requestBody.data.ticket, selectedModel);
    return Response.json({
      ...classification,
      promptVersion: selectedEngine === "llm" ? PROMPT_VERSION : null,
      engine: selectedEngine,
      model: selectedEngine === "decisionRules" ? decisionRulesModelName() : selectedModel,
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 404) {
        return Response.json(
          { error: "The configured triage model was not found. Please contact support." },
          { status: 502 },
        );
      }
      if (error.status === 401 || error.status === 403) {
        return Response.json(
          { error: "The triage service is not configured correctly. Please contact support." },
          { status: 503 },
        );
      }
      return Response.json(
        { error: "The triage service is temporarily unavailable. Please try again." },
        { status: 502 },
      );
    }

    return Response.json(
      { error: "Unable to triage this ticket right now. Please try again." },
      { status: 502 },
    );
  }
}
