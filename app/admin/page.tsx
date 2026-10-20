import Link from "next/link";
import { listSmokeRuns } from "../../lib/smokeRunStore";

function percent(value: number | null) {
  return value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;
}

function cost(value: number | null) {
  return value === null ? "Not configured / unavailable" : `$${value.toFixed(6)}`;
}

export const runtime = "nodejs";

export default function AdminPage() {
  const runs = listSmokeRuns();
  const comparisonGroups = new Map<string, typeof runs>();
  for (const run of runs) {
    const groupId = run.comparisonGroupId || run.id;
    comparisonGroups.set(groupId, [...(comparisonGroups.get(groupId) ?? []), run]);
  }
  const comparisons = [...comparisonGroups.values()].filter((group) => group.length > 1);

  return (
    <main className="triage-page">
      <header className="triage-nav">
        <Link className="triage-wordmark" href="/" aria-label="Support desk home">
          <span className="triage-wordmark-mark">SD</span>
          <span className="triage-wordmark-name">SUPPORT<br />DESK / ADMIN</span>
        </Link>
        <Link className="triage-chat-link" href="/smoke-test">SMOKE TEST</Link>
      </header>

      <section className="triage-heading">
        <p className="triage-eyebrow"><span>05</span> RUN HISTORY / ADMIN</p>
        <h1>Smoke <span>runs.</span></h1>
      </section>

      {runs.length === 0 ? (
        <section className="triage-output">
          <div className="triage-output-body">
            <div className="triage-empty-state">
              <span className="triage-empty-mark" aria-hidden="true">--</span>
              <p>NO RUNS LOGGED</p>
              <span>START A SMOKE TEST TO CREATE THE FIRST RUN</span>
            </div>
          </div>
        </section>
      ) : (
        <>
        {comparisons.length > 0 && (
          <section className="admin-comparisons" aria-label="Model comparisons">
            <h2>Model comparisons</h2>
            {comparisons.map((group) => (
              <div className="admin-comparison" key={group[0].comparisonGroupId}>
                <p className="triage-panel-index">
                  {group[0].dataset} / same {group[0].sampleSize}-ticket sample
                </p>
                <div className="admin-comparison-scroll">
                  <table>
                    <thead>
                      <tr><th>Metric</th>{group.map((run) => <th key={run.id}>{run.model}<small>{new Date(run.createdAt).toLocaleString()}</small></th>)}</tr>
                    </thead>
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

        <section className="admin-runs" aria-label="Logged smoke test runs">
          {runs.map((run) => (
            <article className="admin-run" key={run.id}>
              <header className="admin-run-heading">
                <div>
                  <span className="triage-panel-index">{run.dataset} / {run.sampleSize} TICKETS</span>
                  <h2>{new Date(run.createdAt).toLocaleString()}</h2>
                </div>
                <span className="triage-output-status">{run.model}</span>
              </header>

              <dl className="admin-run-metrics">
                <div><dt>Category accuracy</dt><dd>{percent(run.categoryAccuracy)}</dd></div>
                <div><dt>Priority accuracy</dt><dd>{percent(run.priorityAccuracy)}</dd></div>
                <div><dt>Exact accuracy</dt><dd>{percent(run.exactAccuracy)}</dd></div>
                <div><dt>Latency</dt><dd>{(run.latencyMs / 1000).toFixed(2)} s</dd></div>
                <div><dt>Estimated cost</dt><dd>{cost(run.estimatedCostUsd)}</dd></div>
                <div><dt>Tokens (in / out / total)</dt><dd>
                  {run.inputTokens === null || run.outputTokens === null || run.totalTokens === null
                    ? "Unavailable"
                    : `${run.inputTokens} / ${run.outputTokens} / ${run.totalTokens}`}
                </dd></div>
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
        </>
      )}

      <footer className="triage-footer">
        <span>SUPPORT SYSTEMS</span><span>ADMIN / RUN HISTORY</span>
      </footer>
    </main>
  );
}
