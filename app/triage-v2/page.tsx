"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  TokenUsageSchema,
  TriageResultSchema,
  type TriageResult,
  type TokenUsage,
} from "../../lib/schema";

export default function TriageV2Page() {
  const [ticketJson, setTicketJson] = useState("");
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setUsage(null);

    let parsedTicket: unknown;

    try {
      parsedTicket = JSON.parse(ticketJson);
    } catch {
      setError("Please paste valid JSON.");
      setIsSubmitting(false);
      return;
    }
    try {
      const triageResponse = await fetch("/api/triage-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: parsedTicket }),
      });

      const payload = await triageResponse.json();

      if (!triageResponse.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Triage request failed.",
        );
      }

      if (!("result" in payload))
        throw new Error("The triage service returned an unexpected response.");

      const checkedResult = TriageResultSchema.safeParse(payload.result);

      if (!checkedResult.success) {
        throw new Error(
          "The triage service returned an invalid result. Please try again.",
        );
      }
      setResult(checkedResult.data);

      const checkedUsage = TokenUsageSchema.safeParse(payload.usage);
      setUsage(checkedUsage.success ? checkedUsage.data : null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to triage the ticket. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
            DESK / 03
          </span>
        </Link>
        <Link className="triage-chat-link" href="/triage">
          TRIAGE V1
        </Link>
      </header>

      <section className="triage-heading">
        <p className="triage-eyebrow">
          <span>03</span> VALIDATED JSON / ZOD
        </p>
        <h1>
          Triage <span>V2.</span>
        </h1>
      </section>

      <div className="triage-workspace">
        <form
          className="triage-form"
          onSubmit={submitTicket}
          aria-busy={isSubmitting}
        >
          <div className="triage-panel-heading">
            <span className="triage-panel-index">A / 01</span>
            <span>Ticket details</span>
            <span className="triage-new-tag">INPUT</span>
          </div>
          <div className="triage-fields">
            <label htmlFor="v2-body">TICKET BODY</label>
            <textarea
              id="v2-body"
              className="triage-input triage-ticket-body"
              value={ticketJson}
              onChange={(event) => setTicketJson(event.target.value)}
              placeholder="Paste you JSON here."
              rows={8}
              maxLength={5000}
              required
              disabled={isSubmitting}
            />
            <button
              className="triage-submit"
              type="submit"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? "RUNNING TRIAGE" : "RUN TRIAGE V2"}</span>
              <span className="triage-submit-mark" aria-hidden="true">
                +
              </span>
            </button>
          </div>
        </form>

        <section
          className={`triage-output${result ? " has-answer" : ""}`}
          aria-live="polite"
          aria-busy={isSubmitting}
        >
          <header className="triage-output-heading">
            <div>
              <span className="triage-panel-index">B / 02</span>
              <h2>Checked assessment</h2>
            </div>
            <span className="triage-output-status">
              {isSubmitting ? "PROCESSING" : result ? "ZOD VALID" : "STANDBY"}
            </span>
          </header>
          <div className="triage-output-body">
            {result ? (
              <dl className="triage-v2-result">
                <div>
                  <dt>Category</dt>
                  <dd>{result.category}</dd>
                </div>
                <div>
                  <dt>Priority</dt>
                  <dd>{result.priority}</dd>
                </div>
                <div>
                  <dt>Summary</dt>
                  <dd>{result.summary}</dd>
                </div>
                <div>
                  <dt>Suggested action</dt>
                  <dd>{result.suggested_action}</dd>
                </div>
              </dl>
            ) : (
              <div className="triage-empty-state">
                <span className="triage-empty-mark" aria-hidden="true">
                  --
                </span>
                <p>{isSubmitting ? "CHECKING RESULT" : "AWAITING TICKET"}</p>
                <span>CATEGORY / PRIORITY / SUMMARY / ACTION</span>
              </div>
            )}
          </div>

          {usage && (
            <p>
              Tokens: {usage.inputTokens} input / {usage.outputTokens} output /{" "}
              {usage.totalTokens} total
            </p>
          )}

          {error && (
            <p className="triage-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      <footer className="triage-footer">
        <span>SUPPORT SYSTEMS</span>
        <span>TRIAGE / V2</span>
      </footer>
    </main>
  );
}
