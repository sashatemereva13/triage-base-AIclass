import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

export type SmokeRun = {
  id: string;
  createdAt: string;
  dataset: "labelled100" | "tickets500";
  sampleSize: number;
  comparisonGroupId: string;
  sampleTicketIds: string[];
  model: string;
  categoryAccuracy: number | null;
  priorityAccuracy: number | null;
  exactAccuracy: number | null;
  outcomeCounts: {
    successful: number;
    bothCorrect: number;
    categoryMismatchOnly: number;
    priorityMismatchOnly: number;
    bothMismatched: number;
    failed: number;
  };
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
};

const databasePath = process.env.SMOKE_TEST_DB_PATH ??
  path.join(process.cwd(), "data", "smoke-test-runs.sqlite");
mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS smoke_test_runs (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    dataset TEXT NOT NULL,
    sample_size INTEGER NOT NULL,
    comparison_group_id TEXT NOT NULL,
    sample_ticket_ids TEXT NOT NULL,
    model TEXT NOT NULL,
    category_accuracy REAL,
    priority_accuracy REAL,
    exact_accuracy REAL,
    outcome_counts TEXT NOT NULL,
    latency_ms INTEGER NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd REAL
  );
`);

const existingColumns = database.prepare("PRAGMA table_info(smoke_test_runs)")
  .all() as Array<{ name: string }>;
if (!existingColumns.some((column) => column.name === "comparison_group_id")) {
  database.exec("ALTER TABLE smoke_test_runs ADD COLUMN comparison_group_id TEXT NOT NULL DEFAULT ''");
}
if (!existingColumns.some((column) => column.name === "sample_ticket_ids")) {
  database.exec("ALTER TABLE smoke_test_runs ADD COLUMN sample_ticket_ids TEXT NOT NULL DEFAULT '[]'");
}

export function saveSmokeRun(
  run: Omit<SmokeRun, "id" | "createdAt">,
): SmokeRun {
  const saved: SmokeRun = {
    ...run,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  database.prepare(`
    INSERT INTO smoke_test_runs (
      id, created_at, dataset, sample_size, comparison_group_id, sample_ticket_ids, model,
      category_accuracy, priority_accuracy, exact_accuracy,
      outcome_counts, latency_ms, input_tokens, output_tokens,
      total_tokens, estimated_cost_usd
    ) VALUES (
      @id, @createdAt, @dataset, @sampleSize, @comparisonGroupId, @sampleTicketIds, @model,
      @categoryAccuracy, @priorityAccuracy, @exactAccuracy,
      @outcomeCounts, @latencyMs, @inputTokens, @outputTokens,
      @totalTokens, @estimatedCostUsd
    )
  `).run({
    ...saved,
    sampleTicketIds: JSON.stringify(saved.sampleTicketIds),
    outcomeCounts: JSON.stringify(saved.outcomeCounts),
  });

  return saved;
}

type StoredSmokeRun = Omit<SmokeRun, "createdAt" | "dataset" | "sampleSize" | "comparisonGroupId" | "sampleTicketIds" | "categoryAccuracy" | "priorityAccuracy" | "exactAccuracy" | "outcomeCounts" | "latencyMs" | "inputTokens" | "outputTokens" | "totalTokens" | "estimatedCostUsd"> & {
  created_at: string;
  dataset: SmokeRun["dataset"];
  sample_size: number;
  comparison_group_id: string;
  sample_ticket_ids: string;
  category_accuracy: number | null;
  priority_accuracy: number | null;
  exact_accuracy: number | null;
  outcome_counts: string;
  latency_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
};

export function listSmokeRuns(): SmokeRun[] {
  const rows = database.prepare(
    "SELECT * FROM smoke_test_runs ORDER BY created_at DESC",
  ).all() as unknown as StoredSmokeRun[];

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    dataset: row.dataset,
    sampleSize: row.sample_size,
    comparisonGroupId: row.comparison_group_id,
    sampleTicketIds: JSON.parse(row.sample_ticket_ids) as string[],
    model: row.model,
    categoryAccuracy: row.category_accuracy,
    priorityAccuracy: row.priority_accuracy,
    exactAccuracy: row.exact_accuracy,
    outcomeCounts: JSON.parse(row.outcome_counts) as SmokeRun["outcomeCounts"],
    latencyMs: row.latency_ms,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    estimatedCostUsd: row.estimated_cost_usd,
  }));
}
