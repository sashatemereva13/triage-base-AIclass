"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload !== null &&
          "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Unable to sign in.";
        throw new Error(message);
      }
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="triage-page">
      <header className="triage-nav">
        <Link className="triage-wordmark" href="/" aria-label="Support desk home">
          <span className="triage-wordmark-mark">SD</span>
          <span className="triage-wordmark-name">SUPPORT<br />DESK / ADMIN</span>
        </Link>
      </header>
      <section className="triage-heading">
        <p className="triage-eyebrow"><span>05</span> RESTRICTED RUN HISTORY</p>
        <h1>Admin <span>access.</span></h1>
      </section>
      <form className="triage-form admin-login-form" onSubmit={login}>
        <div className="triage-panel-heading"><span>RUN HISTORY</span><span className="triage-new-tag">PRIVATE</span></div>
        <div className="triage-fields">
          {configured ? <>
            <label htmlFor="admin-password">ADMIN PASSWORD</label>
            <input id="admin-password" className="triage-input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={submitting} />
            <button className="triage-submit" type="submit" disabled={submitting || !password}>
              <span>{submitting ? "SIGNING IN" : "VIEW RUN HISTORY"}</span><span className="triage-submit-mark" aria-hidden="true">↗</span>
            </button>
          </> : <p className="triage-info">Admin access is not configured. Set <code>ADMIN_PASSWORD</code> in your environment, then restart the app.</p>}
          {error && <p className="triage-error" role="alert">{error}</p>}
        </div>
      </form>
    </main>
  );
}
