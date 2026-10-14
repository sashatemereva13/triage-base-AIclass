"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function TriagePage() {
  const [subject, setSubject] = useState("");
  const [ticketBody, setTicketBody] = useState("");
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setAnswer("");

    try {
      const triageResponse = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket: {
            subject,
            body: ticketBody,
          },
        }),
      });

      const triageAnswer = await triageResponse.text();

      if (!triageResponse.ok) {
        throw new Error(triageAnswer || "Triage request failed.");
      }

      setAnswer(triageAnswer);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to triage the ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="triage-page">
      <header className="triage-nav">
        <Link className="triage-wordmark" href="/" aria-label="Support desk home">
          <span className="triage-wordmark-mark">SD</span>
          <span className="triage-wordmark-name">SUPPORT<br />DESK / 01</span>
        </Link>
        <Link className="triage-chat-link" href="/chat">
          CHAT
        </Link>
      </header>

      <section className="triage-heading">
        <p className="triage-eyebrow">
          <span>01</span> INCOMING REQUEST / TRIAGE
        </p>
        <h1>
          Ticket <span>triage.</span>
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
            <span className="triage-new-tag">NEW</span>
          </div>

          <div className="triage-fields">
            <label htmlFor="subject">SUBJECT</label>
            <textarea
              id="subject"
              className="triage-input triage-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="CSV export leaves out filtered results"
              rows={1}
              disabled={isSubmitting}
            />

            <label htmlFor="ticket-body">TICKET BODY</label>
            <textarea
              id="ticket-body"
              className="triage-input triage-ticket-body"
              value={ticketBody}
              onChange={(event) => setTicketBody(event.target.value)}
              placeholder="Describe the issue, what you expected, and what happened."
              rows={8}
              disabled={isSubmitting}
            />

            <button
              className="triage-submit"
              type="submit"
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? "RUNNING TRIAGE" : "RUN TRIAGE"}</span>
              <span className="triage-submit-mark" aria-hidden="true">
                +
              </span>
            </button>
          </div>
        </form>

        <section
          className={`triage-output${answer ? " has-answer" : ""}`}
          aria-live="polite"
          aria-busy={isSubmitting}
        >
          <header className="triage-output-heading">
            <div>
              <span className="triage-panel-index">B / 02</span>
              <h2>Assessment</h2>
            </div>
            <span className="triage-output-status">
              {isSubmitting ? "PROCESSING" : answer ? "COMPLETE" : "STANDBY"}
            </span>
          </header>

          <div className="triage-output-body">
            {answer ? (
              <pre>{answer}</pre>
            ) : (
              <div className="triage-empty-state">
                <span className="triage-empty-mark" aria-hidden="true">
                  --
                </span>
                <p>{isSubmitting ? "READING TICKET" : "AWAITING TICKET"}</p>
                <span>CATEGORY / PRIORITY / SUMMARY / ACTION</span>
              </div>
            )}
          </div>

          {error && (
            <p className="triage-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      <footer className="triage-footer">
        <span>SUPPORT SYSTEMS</span>
        <span>TRIAGE / V1</span>
      </footer>
    </main>
  );
}
