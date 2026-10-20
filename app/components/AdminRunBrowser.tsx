"use client";

import { useMemo, useState } from "react";
import type { SmokeRun } from "../../lib/smokeRunStore";

const PAGE_SIZE = 12;

function percent(value: number | null) {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function cost(value: number | null) {
  return value === null ? "Unavailable" : `$${value.toFixed(6)}`;
}

export function AdminRunBrowser({ runs }: { runs: SmokeRun[] }) {
  const [dataset, setDataset] = useState("all");
  const [model, setModel] = useState("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [page, setPage] = useState(0);
  const models = [...new Set(runs.map((run) => run.model))].sort();

  const filteredRuns = useMemo(() => runs
    .filter((run) => dataset === "all" || run.dataset === dataset)
    .filter((run) => model === "all" || run.model === model)
    .sort((a, b) => newestFirst
      ? b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt)),
  [runs, dataset, model, newestFirst]);

  const totalPages = Math.ceil(filteredRuns.length / PAGE_SIZE);
  const visibleRuns = filteredRuns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const comparisons = useMemo(() => {
    const groups = new Map<string, SmokeRun[]>();
    for (const run of filteredRuns) {
      const key = run.comparisonGroupId || run.id;
      groups.set(key, [...(groups.get(key) ?? []), run]);
    }
    return [...groups.values()]
      .filter((group) => group.length > 1)
      .map((group) => group.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
      .filter((group) => group.every((run) =>
        run.dataset === group[0].dataset &&
        run.sampleSize === group[0].sampleSize &&
        JSON.stringify(run.sampleTicketIds) === JSON.stringify(group[0].sampleTicketIds)))
      .sort((a, b) => b[0].createdAt.localeCompare(a[0].createdAt));
  }, [filteredRuns]);

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <>
      <div className="admin-toolbar">
        <label>DATASET
          <select className="triage-input" value={dataset} onChange={(event) => { setDataset(event.target.value); setPage(0); }}>
            <option value="all">All datasets</option>
            <option value="labelled100">Labelled 100</option>
            <option value="tickets500">Unlabelled 500</option>
          </select>
        </label>
        <label>MODEL
          <select className="triage-input" value={model} onChange={(event) => { setModel(event.target.value); setPage(0); }}>
            <option value="all">All models</option>
            {models.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button className="triage-secondary-button" type="button" onClick={() => setNewestFirst((value) => !value)}>
          {newestFirst ? "NEWEST FIRST" : "OLDEST FIRST"}
        </button>
        <button className="triage-secondary-button" type="button" onClick={logout}>SIGN OUT</button>
      </div>

      {comparisons.length > 0 && (
        <section className="admin-comparisons" aria-label="Model comparisons">
          <h2>Same-sample comparisons</h2>
          {comparisons.map((group) => (
            <div className="admin-comparison" key={group[0].comparisonGroupId}>
              <p className="triage-panel-index">{group[0].dataset} / SAME {group[0].sampleSize}-TICKET SAMPLE</p>
              <div className="admin-comparison-scroll">
                <table>
                  <thead><tr><th>Metric</th>{group.map((run, index) => <th key={run.id}>{index === 0 ? "BASELINE · " : "COMPARISON · "}{run.model}<small><time>{new Date(run.createdAt).toLocaleString()}</time></small></th>)}</tr></thead>
                  <tbody>
                    <tr><th>Category accuracy</th>{group.map((run) => <td key={run.id}>{percent(run.categoryAccuracy)}</td>)}</tr>
                    <tr><th>Priority accuracy</th>{group.map((run) => <td key={run.id}>{percent(run.priorityAccuracy)}</td>)}</tr>
                    <tr><th>Exact accuracy</th>{group.map((run) => <td key={run.id}>{percent(run.exactAccuracy)}</td>)}</tr>
                    <tr><th>Successful / failed</th>{group.map((run) => <td key={run.id}>{run.outcomeCounts.successful} / {run.outcomeCounts.failed}</td>)}</tr>
                    <tr><th>Latency</th>{group.map((run) => <td key={run.id}>{(run.latencyMs / 1000).toFixed(2)} s</td>)}</tr>
                    <tr><th>Estimated cost</th>{group.map((run) => <td key={run.id}>{cost(run.estimatedCostUsd)}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      <p className="admin-cost-note">Cost is estimated from the configured per-model token rates. Missing rates or token usage are shown as unavailable.</p>
      <section className="admin-runs" aria-label="Logged smoke test runs">
        {visibleRuns.map((run) => (
          <article className="admin-run" key={run.id}>
            <header className="admin-run-heading">
              <div><span className="triage-panel-index">{run.dataset} / {run.sampleSize} TICKETS</span><h2><time>{new Date(run.createdAt).toLocaleString()}</time></h2></div>
              <span className="triage-output-status">{run.model}</span>
            </header>
            <dl className="admin-run-metrics">
              <div><dt>Category accuracy</dt><dd>{percent(run.categoryAccuracy)}</dd></div>
              <div><dt>Priority accuracy</dt><dd>{percent(run.priorityAccuracy)}</dd></div>
              <div><dt>Exact accuracy</dt><dd>{percent(run.exactAccuracy)}</dd></div>
              <div><dt>Latency</dt><dd>{(run.latencyMs / 1000).toFixed(2)} s</dd></div>
              <div><dt>Estimated cost</dt><dd>{cost(run.estimatedCostUsd)}</dd></div>
              <div><dt>Tokens (in / out / total)</dt><dd>{run.totalTokens === null ? "Unavailable" : `${run.inputTokens} / ${run.outputTokens} / ${run.totalTokens}`}</dd></div>
              <div><dt>Successful / failed</dt><dd>{run.outcomeCounts.successful} / {run.outcomeCounts.failed}</dd></div>
              {run.dataset === "labelled100" && <>
                <div><dt>Both correct</dt><dd>{run.outcomeCounts.bothCorrect}</dd></div>
                <div><dt>Category mismatch only</dt><dd>{run.outcomeCounts.categoryMismatchOnly}</dd></div>
                <div><dt>Priority mismatch only</dt><dd>{run.outcomeCounts.priorityMismatchOnly}</dd></div>
                <div><dt>Both mismatched</dt><dd>{run.outcomeCounts.bothMismatched}</dd></div>
              </>}
            </dl>
            <p className="admin-run-id">Run ID: {run.id}</p>
          </article>
        ))}
      </section>
      {filteredRuns.length === 0 && <p className="triage-info">No runs match these filters.</p>}
      {totalPages > 1 && <nav className="admin-pagination" aria-label="Run history pages">
        <button className="triage-secondary-button" type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>PREVIOUS</button>
        <span>PAGE {page + 1} / {totalPages} · {filteredRuns.length} RUNS</span>
        <button className="triage-secondary-button" type="button" onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} disabled={page + 1 >= totalPages}>NEXT</button>
      </nav>}
    </>
  );
}
