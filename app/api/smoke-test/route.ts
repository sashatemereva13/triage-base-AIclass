import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { classifyTicket } from "../../../lib/classifyTicket";
import { classifyTicketWithDecisionRules, decisionRulesConfigured, decisionRulesModelName } from "../../../lib/decisionRules";
import { isSupportedModel, llmModel } from "../../../lib/llm";
import { saveSmokeRun } from "../../../lib/smokeRunStore";

const SmokeTestRequestSchema = z
  .object({
    dataset: z.enum(["labelled100", "tickets500"]),
    sampleSize: z.number().int().min(1),
    model: z.string().trim().min(1),
    engine: z.enum(["llm", "decisionRules"]).optional(),
    ticketIds: z.array(z.string().min(1)).min(1).optional(),
    comparisonGroupId: z.string().uuid().optional(),
  })
  .strict();

type DatasetName = z.infer<typeof SmokeTestRequestSchema>["dataset"];
type TicketRecord = {
  ticket_id?: string;
  subject: string;
  body: string;
  category?: string;
  priority?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function loadDataset(dataset: DatasetName): Promise<TicketRecord[]> {
  const filename = dataset === "labelled100"
    ? "support_tickets_100_labelled.json"
    : "support_tickets_500.json";
  const fileText = await readFile(path.join(process.cwd(), "data", filename), "utf8");
  const raw: unknown = JSON.parse(fileText);
  if (!Array.isArray(raw)) throw new Error("Dataset must contain a JSON array.");

  return raw.filter(
    (item): item is TicketRecord =>
      isRecord(item) && typeof item.subject === "string" && typeof item.body === "string",
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = SmokeTestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Choose a dataset and provide a positive whole-number sample size." },
      { status: 400 },
    );
  }

  const { dataset, sampleSize, model, ticketIds, comparisonGroupId } = parsed.data;
  const engine = parsed.data.engine ?? "llm";
  if (engine === "decisionRules" && !decisionRulesConfigured()) {
    return Response.json(
      { error: "DecisionRules is not configured. Set DECISIONRULES_API_KEY and DECISIONRULES_RULE_ID in the server environment." },
      { status: 503 },
    );
  }
  if (engine === "llm" && !isSupportedModel(model)) {
    return Response.json({ error: "Choose one of the configured LLM models." }, { status: 400 });
  }
  try {
    const tickets = await loadDataset(dataset);
    if (sampleSize > tickets.length) {
      return Response.json(
        { error: `Sample size cannot exceed ${tickets.length}.` },
        { status: 400 },
      );
    }

    let sample: TicketRecord[];
    if (ticketIds) {
      if (ticketIds.length !== sampleSize || new Set(ticketIds).size !== ticketIds.length) {
        return Response.json({ error: "The comparison sample IDs do not match the sample size." }, { status: 400 });
      }
      const ticketById = new Map(tickets.map((ticket, index) => [
        ticket.ticket_id ?? `sample-${index + 1}`,
        ticket,
      ]));
      const selected = ticketIds.map((id) => ticketById.get(id));
      if (selected.some((ticket) => ticket === undefined)) {
        return Response.json({ error: "One or more comparison tickets were not found in this dataset." }, { status: 400 });
      }
      sample = selected as TicketRecord[];
    } else {
      sample = shuffle(tickets).slice(0, sampleSize);
    }
    const stableTicketIds = sample.map((ticket, index) => ticket.ticket_id ?? `sample-${index + 1}`);
    const runComparisonGroupId = comparisonGroupId ?? randomUUID();
    const runStartedAt = performance.now();
    const results: Array<{
      id: string;
      subject: string;
      prediction: { category: string; priority: string } | null;
      label: { category: string | null; priority: string | null } | null;
      usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
      latencyMs: number;
      error: string | null;
    }> = new Array(sample.length);

    // Limit concurrent calls to avoid sending a large sample all at once.
    let nextIndex = 0;
    const worker = async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= sample.length) return;
        const ticket = sample[index];
        const id = ticket.ticket_id ?? `sample-${index + 1}`;
        const ticketStartedAt = performance.now();
        const label = dataset === "labelled100"
          ? { category: ticket.category ?? null, priority: ticket.priority ?? null }
          : null;

        try {
          const ticketInput = {
            subject: ticket.subject,
            body: ticket.body,
          };
          const classification = engine === "decisionRules"
            ? await classifyTicketWithDecisionRules(ticketInput)
            : await classifyTicket(ticketInput, model);
          results[index] = {
            id,
            subject: ticket.subject,
            prediction: {
              category: classification.result.category,
              priority: classification.result.priority,
            },
            label,
            usage: classification.usage,
            latencyMs: Math.round(performance.now() - ticketStartedAt),
            error: null,
          };
        } catch {
          results[index] = {
            id,
            subject: ticket.subject,
            prediction: null,
            label,
            usage: null,
            latencyMs: Math.round(performance.now() - ticketStartedAt),
            error: "Classification failed for this ticket.",
          };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(5, sample.length) }, () => worker()),
    );

    const successful = results.filter((item) => item.prediction !== null);
    const outcomes = {
      successful: successful.length,
      bothCorrect: 0,
      categoryMismatchOnly: 0,
      priorityMismatchOnly: 0,
      bothMismatched: 0,
      failed: results.length - successful.length,
    };

    if (dataset === "labelled100") {
      for (const item of successful) {
        const categoryWrong = item.prediction!.category !== item.label?.category;
        const priorityWrong = item.prediction!.priority !== item.label?.priority;
        if (categoryWrong && priorityWrong) outcomes.bothMismatched++;
        else if (categoryWrong) outcomes.categoryMismatchOnly++;
        else if (priorityWrong) outcomes.priorityMismatchOnly++;
        else outcomes.bothCorrect++;
      }
    }

    const labeled = dataset === "labelled100";
    const evaluated = outcomes.bothCorrect + outcomes.categoryMismatchOnly +
      outcomes.priorityMismatchOnly + outcomes.bothMismatched;
    const categoryCorrect = outcomes.bothCorrect + outcomes.priorityMismatchOnly;
    const priorityCorrect = outcomes.bothCorrect + outcomes.categoryMismatchOnly;
    const categoryAccuracy = labeled && evaluated > 0 ? categoryCorrect / evaluated : null;
    const priorityAccuracy = labeled && evaluated > 0 ? priorityCorrect / evaluated : null;
    const exactAccuracy = labeled && evaluated > 0 ? outcomes.bothCorrect / evaluated : null;
    const inputTokens = results.reduce((sum, item) => sum + (item.usage?.inputTokens ?? 0), 0);
    const outputTokens = results.reduce((sum, item) => sum + (item.usage?.outputTokens ?? 0), 0);
    const totalTokens = results.reduce((sum, item) => sum + (item.usage?.totalTokens ?? 0), 0);
    const allUsageKnown = results.every((item) => item.usage !== null);
    let pricing: Record<string, { inputPer1MUsd: number; outputPer1MUsd: number }> = {};
    try {
      const parsedPricing: unknown = JSON.parse(process.env.LLM_MODEL_PRICING_JSON ?? "{}");
      if (isRecord(parsedPricing)) {
        pricing = Object.fromEntries(
          Object.entries(parsedPricing).flatMap(([name, rates]) =>
            isRecord(rates) && typeof rates.inputPer1MUsd === "number" &&
              typeof rates.outputPer1MUsd === "number" && rates.inputPer1MUsd >= 0 &&
              rates.outputPer1MUsd >= 0
              ? [[name, { inputPer1MUsd: rates.inputPer1MUsd, outputPer1MUsd: rates.outputPer1MUsd }]]
              : [],
          ),
        );
      }
    } catch {
      // Invalid optional pricing configuration leaves cost unavailable.
    }
    const recordedModel = engine === "decisionRules" ? decisionRulesModelName() : model;
    if (engine === "decisionRules") {
      // DecisionRules Free includes 1,000 Solver API calls/month. The estimate is
      // zero only while the account remains within its included monthly quota.
      pricing[recordedModel] = { inputPer1MUsd: 0, outputPer1MUsd: 0 };
    } else if (!pricing[model] && model === llmModel) {
      const inputRateValue = process.env.LLM_INPUT_COST_PER_1M_USD?.trim();
      const outputRateValue = process.env.LLM_OUTPUT_COST_PER_1M_USD?.trim();
      const inputPer1MUsd = inputRateValue ? Number(inputRateValue) : Number.NaN;
      const outputPer1MUsd = outputRateValue ? Number(outputRateValue) : Number.NaN;
      if (Number.isFinite(inputPer1MUsd) && inputPer1MUsd >= 0 &&
        Number.isFinite(outputPer1MUsd) && outputPer1MUsd >= 0) {
        pricing[model] = { inputPer1MUsd, outputPer1MUsd };
      }
    }
    const modelPricing = pricing[recordedModel] ?? pricing[model];
    const estimatedCostUsd = engine === "decisionRules"
      ? 0
      : allUsageKnown && modelPricing
        ? (inputTokens * modelPricing.inputPer1MUsd + outputTokens * modelPricing.outputPer1MUsd) / 1_000_000
        : null;
    const latencyMs = Math.round(performance.now() - runStartedAt);

    const savedRun = saveSmokeRun({
      dataset,
      sampleSize: sample.length,
      comparisonGroupId: runComparisonGroupId,
      sampleTicketIds: stableTicketIds,
      model: recordedModel,
      categoryAccuracy,
      priorityAccuracy,
      exactAccuracy,
      outcomeCounts: outcomes,
      latencyMs,
      inputTokens: allUsageKnown ? inputTokens : null,
      outputTokens: allUsageKnown ? outputTokens : null,
      totalTokens: allUsageKnown ? totalTokens : null,
      estimatedCostUsd,
    });

    const summary = labeled
      ? {
          categoryMismatches: outcomes.categoryMismatchOnly + outcomes.bothMismatched,
          priorityMismatches: outcomes.priorityMismatchOnly + outcomes.bothMismatched,
          successfulPredictions: successful.length,
          failedPredictions: outcomes.failed,
          evaluatedPredictions: evaluated,
          categoryAccuracy,
          priorityAccuracy,
          exactAccuracy,
        }
      : null;

    return Response.json({
      runId: savedRun.id,
      comparisonGroupId: runComparisonGroupId,
      sampleTicketIds: stableTicketIds,
      model: recordedModel,
      engine,
      dataset,
      sampleSize: sample.length,
      results,
      summary,
      metrics: {
        categoryAccuracy,
        priorityAccuracy,
        exactAccuracy,
        outcomeCounts: outcomes,
        latencyMs,
        inputTokens: allUsageKnown ? inputTokens : null,
        outputTokens: allUsageKnown ? outputTokens : null,
        totalTokens: allUsageKnown ? totalTokens : null,
        estimatedCostUsd,
        model: recordedModel,
      },
    });
  } catch {
    return Response.json(
      { error: "Unable to complete or save this smoke test run." },
      { status: 500 },
    );
  }
}
