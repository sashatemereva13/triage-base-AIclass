import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-nav">
        <Link className="home-wordmark" href="/" aria-label="Support desk home">
          <span className="home-wordmark-mark">SD</span>
          <span className="home-wordmark-name">SUPPORT<br />DESK / 01</span>
        </Link>
        <span className="home-nav-note">CUSTOMER OPERATIONS<br />TRIAGE WORKSPACE</span>
        <Link className="home-nav-admin" href="/admin">ADMIN ↗</Link>
      </header>

      <section className="home-editorial" aria-labelledby="home-title">
        <p className="home-eyebrow"><span>01 — INTAKE</span> SUPPORT, WITH CLARITY</p>
        <h1 id="home-title">Every ticket<br />deserves a <em>clear</em><br />next step.</h1>
        <p className="home-deck">
          Read the request. Understand the issue. Give your team a practical place to start.
        </p>
      </section>

      <section className="home-primary" aria-labelledby="primary-title">
        <div className="home-primary-copy">
          <p className="home-section-label">PRIMARY WORKFLOW / TRIAGE V2</p>
          <h2 id="primary-title">A thoughtful first response starts here.</h2>
          <p>Get a structured category, priority, summary, and suggested action for an incoming support ticket.</p>
        </div>
        <Link className="home-primary-action" href="/triage-v2">
          <span>TRIAGE A TICKET</span><span aria-hidden="true">↗</span>
        </Link>
        <span className="home-primary-index" aria-hidden="true">01</span>
      </section>

      <div className="home-secondary-grid">
        <section className="home-secondary" aria-labelledby="workspace-title">
          <p className="home-section-label">OTHER WORKSPACES</p>
          <h2 id="workspace-title">Choose a different way in.</h2>
          <nav className="home-link-list" aria-label="Other workspaces">
            <Link href="/chat"><span><small>02 / CONVERSATION</small><strong>Open support chat</strong></span><span aria-hidden="true">↗</span></Link>
            <Link href="/triage"><span><small>03 / ORIGINAL EXERCISE</small><strong>Ticket triage V1</strong></span><span aria-hidden="true">↗</span></Link>
          </nav>
        </section>

        <section className="home-secondary home-evaluation" aria-labelledby="evaluation-title">
          <p className="home-section-label">EVALUATION / RUN HISTORY</p>
          <h2 id="evaluation-title">Check the system’s work.</h2>
          <nav className="home-link-list" aria-label="Evaluation tools">
            <Link href="/smoke-test"><span><small>04 / RANDOM SAMPLE</small><strong>Run a smoke test</strong></span><span aria-hidden="true">↗</span></Link>
            <Link href="/admin"><span><small>05 / SAVED RUNS</small><strong>Review run history</strong></span><span aria-hidden="true">↗</span></Link>
          </nav>
        </section>
      </div>

      <footer className="home-footer">
        <span>SUPPORT SYSTEMS</span>
        <span>READ CAREFULLY / ROUTE CLEARLY</span>
      </footer>
    </main>
  );
}
