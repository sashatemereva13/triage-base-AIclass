"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ModelMenu } from "../components/ModelMenu";

type DatasetName = "labelled100" | "tickets500";
type SmokeResult = {
  id: string;
  subject: string;
  prediction: { category: string; priority: string } | null;
  label: { category: string | null; priority: string | null } | null;
  error: string | null;
};
type SmokeResponse = {
  runId: string;
  comparisonGroupId: string;
  sampleTicketIds: string[];
  model: string;
  dataset: DatasetName;
  sampleSize: number;
  results: SmokeResult[];
  summary: {
    categoryMismatches: number;
    priorityMismatches: number;
    successfulPredictions: number;
    failedPredictions: number;
  } | null;
};

function isSmokeResponse(value: unknown): value is SmokeResponse {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    (data.dataset === "labelled100" || data.dataset === "tickets500") &&
    typeof data.sampleSize === "number" &&
    Array.isArray(data.results) &&
    (data.summary === null || typeof data.summary === "object")
  );
}

export default function SmokeTestPage() {
  const [dataset, setDataset] = useState<DatasetName>("labelled100");
  const [sampleSize, setSampleSize] = useState(10);
  const [data, setData] = useState<SmokeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const maxSampleSize = dataset === "labelled100" ? 100 : 500;

  async function executeSmokeTest(previousRun?: SmokeResponse) {
    setLoading(true);
    setError(null);
    if (!previousRun) setData(null);

    try {
      const response = await fetch("/api/smoke-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset: previousRun?.dataset ?? dataset,
          sampleSize: previousRun?.sampleSize ?? sampleSize,
          model,
          ...(previousRun
            ? {
                ticketIds: previousRun.sampleTicketIds,
                comparisonGroupId: previousRun.comparisonGroupId,
              }
            : {}),
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Smoke test failed.";
        throw new Error(message);
      }
      if (!isSmokeResponse(payload)) {
        throw new Error("The smoke test returned an unexpected response.");
      }
      setData(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Smoke test failed.");
    } finally {
      setLoading(false);
    }
  }

  function runSmokeTest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void executeSmokeTest();
  }

  return (
    <main className="triage-page">
      <header className="triage-nav">
        <Link
          className="triage-wordmark"
          href="/"
          aria-label="Support desk home"
        >
          <span className="triage-wordmark-mark">SD</span>
          <span className="triage-wordmark-name">
            SUPPORT
            <br />
            DESK / TEST
          </span>
        </Link>
        <Link className="triage-chat-link" href="/triage-v2">
          TRIAGE V2
        </Link>
      </header>

      <section className="triage-heading">
        <p className="triage-eyebrow">
          <span>04</span> RANDOM DATASET EVALUATION
        </p>
        <h1>
          Smoke <span>test.</span>
        </h1>
      </section>

      <form className="triage-form" onSubmit={runSmokeTest} aria-busy={loading}>
        <div className="triage-panel-heading">
          <span className="triage-panel-index">A / 01</span>
          <span>Run configuration</span>
        </div>
        <div className="triage-fields">
          <ModelMenu value={model} onChange={setModel} disabled={loading} />
          <label htmlFor="smoke-dataset">DATASET</label>
          <select
            id="smoke-dataset"
            className="triage-input"
            value={dataset}
            onChange={(event) => {
              const next = event.target.value as DatasetName;
              setDataset(next);
              setSampleSize((current) =>
                Math.min(current, next === "labelled100" ? 100 : 500),
              );
            }}
            disabled={loading}
          >
            <option value="labelled100">Labelled 100 tickets</option>
            <option value="tickets500">Unlabelled 500 tickets</option>
          </select>

          <label htmlFor="smoke-size">
            NUMBER OF RANDOM TICKETS (1–{maxSampleSize})
          </label>
          <input
            id="smoke-size"
            className="triage-input"
            type="number"
            min={1}
            max={maxSampleSize}
            step={1}
            value={sampleSize}
            onChange={(event) => setSampleSize(Number(event.target.value))}
            required
            disabled={loading}
          />
          <button className="triage-submit" type="submit" disabled={loading || !model}>
            <span>{loading ? "RUNNING TEST" : "RUN SMOKE TEST"}</span>
            <span className="triage-submit-mark" aria-hidden="true">
              +
            </span>
          </button>
        </div>
      </form>

      {error && (
        <p className="triage-error" role="alert">
          {error}
        </p>
      )}

      {data && (
        <section className="triage-output" aria-live="polite">
          <header className="triage-output-heading">
            <h2>Results / {data.sampleSize} tickets</h2>
          </header>
          <div className="triage-token-usage">
            <span>Model: {data.model}</span>
            <span>Run saved: {data.runId}</span>
          </div>
          {data.model !== model && (
            <button
              className="triage-submit smoke-compare-button"
              type="button"
              disabled={loading}
              onClick={() => void executeSmokeTest(data)}
            >
              <span>{loading ? "RUNNING COMPARISON" : `RUN SAME SAMPLE WITH ${model}`}</span>
              <span className="triage-submit-mark" aria-hidden="true">↻</span>
            </button>
          )}
          {data.summary && (
            <div className="triage-token-usage">
              <span>
                Category mismatches: {data.summary.categoryMismatches}
              </span>
              <span>
                Priority mismatches: {data.summary.priorityMismatches}
              </span>
              <span>Successful: {data.summary.successfulPredictions}</span>
              <span>Failed: {data.summary.failedPredictions}</span>
            </div>
          )}
          <div className="triage-output-body">
            <div className="smoke-results">
              {data.results.map((item) => (
                <article className="smoke-result" key={item.id}>
                  <h3>
                    {item.id} · {item.subject || "(no subject)"}
                  </h3>
                  {item.error || !item.prediction ? (
                    <p className="triage-error">
                      {item.error ?? "No prediction returned."}
                    </p>
                  ) : (
                    <dl className="triage-v2-result">
                      <div>
                        <dt>Category</dt>
                        <dd>
                          Predicted: {item.prediction.category}
                          {item.label &&
                            ` · Label: ${item.label.category ?? "missing"}`}
                        </dd>
                      </div>
                      <div>
                        <dt>Priority</dt>
                        <dd>
                          Predicted: {item.prediction.priority}
                          {item.label &&
                            ` · Label: ${item.label.priority ?? "missing"}`}
                        </dd>
                      </div>
                    </dl>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="triage-footer">
        <span>SUPPORT SYSTEMS</span>
        <span>SMOKE TEST / F3</span>
      </footer>
    </main>
  );
}
