import "server-only";

import { TriageResultSchema, type TriageResult } from "./schema";
import type { TicketInput } from "./classifyTicket";

type DecisionFeatures = {
  isBilling: boolean;
  isAccount: boolean;
  isFeatureRequest: boolean;
  isTechnicalBug: boolean;
  isHighUrgency: boolean;
  isMediumUrgency: boolean;
};

const CATEGORY_GUIDANCE: Record<TriageResult["category"], { summary: string; action: string }> = {
  billing: {
    summary: "The ticket concerns a charge, invoice, refund, or subscription.",
    action: "Review the customer’s billing history and confirm the relevant charge or subscription change.",
  },
  technical_bug: {
    summary: "The ticket reports a product fault or unexpected behavior.",
    action: "Reproduce the behavior, capture the affected feature and environment, then route it to engineering.",
  },
  account: {
    summary: "The ticket concerns account access or account settings.",
    action: "Verify the account and help the customer restore access or update the affected setting.",
  },
  feature_request: {
    summary: "The ticket asks for a product capability or change.",
    action: "Record the requested capability and its use case for product review.",
  },
};

function extractDecisionFeatures(ticket: TicketInput): DecisionFeatures {
  // Send only coarse, non-identifying signals to the external decision service.
  const text = `${ticket.subject}\n${ticket.body}`.toLocaleLowerCase();
  return {
    isBilling: /\b(invoice|billing|charged|charge|payment|refund|tax|subscription|renewal|price)\b/.test(text),
    isAccount: /\b(login|log in|sign in|password|locked out|account|access|mfa|2fa|authentication)\b/.test(text),
    isFeatureRequest: /\b(feature request|would like|could you add|please add|request a feature|it would be great|planned|roadmap|support for)\b/.test(text),
    isTechnicalBug: /\b(error|bug|crash|crashes|broken|not working|doesn't work|fails|failing|regression|slow|unavailable|incorrect)\b/.test(text),
    isHighUrgency: /\b(urgent|outage|down for everyone|production is down|data loss|security breach|breached|cannot work|can't work|blocked completely|all users affected)\b/.test(text),
    isMediumUrgency: /\b(intermittent|workaround|degraded|regression|affects our team|deadline|repeatedly|several users)\b/.test(text),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getDecisionOutput(payload: unknown): Record<string, unknown> | null {
  const candidates = Array.isArray(payload) ? payload.flat(Infinity) : [payload];
  return candidates.find(isRecord) ?? null;
}

export function decisionRulesConfigured() {
  return Boolean(process.env.DECISIONRULES_API_KEY && process.env.DECISIONRULES_RULE_ID);
}

export function decisionRulesModelName() {
  return `DecisionRules / ${process.env.DECISIONRULES_RULE_ID || "Support ticket triage"}`;
}

export async function classifyTicketWithDecisionRules(ticket: TicketInput) {
  const apiKey = process.env.DECISIONRULES_API_KEY;
  const ruleId = process.env.DECISIONRULES_RULE_ID;
  if (!apiKey || !ruleId) {
    throw new Error("DecisionRules is not configured. Add DECISIONRULES_API_KEY and DECISIONRULES_RULE_ID to the server environment.");
  }

  const baseUrl = (process.env.DECISIONRULES_BASE_URL || "https://api.decisionrules.io").replace(/\/+$/, "");
  const version = process.env.DECISIONRULES_RULE_VERSION?.trim();
  const url = `${baseUrl}/rule/solve/${encodeURIComponent(ruleId)}${version ? `/${encodeURIComponent(version)}` : ""}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Strategy": "FIRST_MATCH",
    },
    body: JSON.stringify({ data: extractDecisionFeatures(ticket) }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`DecisionRules returned HTTP ${response.status}. Check the rule, API key, and account quota.`);
  }

  const payload: unknown = await response.json();
  const output = getDecisionOutput(payload);
  if (!output) throw new Error("DecisionRules returned no matching decision.");

  const decision = TriageResultSchema.pick({ category: true, priority: true }).safeParse({
    category: output.category,
    priority: output.priority,
  });
  if (!decision.success) {
    throw new Error("DecisionRules returned an invalid category or priority.");
  }

  const guidance = CATEGORY_GUIDANCE[decision.data.category];
  const result = TriageResultSchema.parse({
    category: decision.data.category,
    priority: decision.data.priority,
    summary: guidance.summary,
    suggested_action: guidance.action,
  });

  return { result, usage: null };
}
