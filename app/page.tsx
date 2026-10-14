import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-nav">
        <Link className="home-wordmark" href="/" aria-label="Support desk home">
          <span className="home-wordmark-mark">SD</span>
          <span className="home-wordmark-name">SUPPORT<br />DESK / 01</span>
        </Link>
        <span className="home-nav-note">SUPPORT SYSTEMS / WORKSPACE 01</span>
      </header>

      <section className="home-heading">
        <p className="home-eyebrow">
          <span>HOME / 00</span> SELECT A WORKSPACE
        </p>
        <h1>
          Support <span>desk.</span>
        </h1>
      </section>

      <nav className="home-options" aria-label="Choose a support workspace">
        <Link className="home-option home-option-chat" href="/chat">
          <span className="home-option-topline">
            <span>CHANNEL / 01</span>
            <span className="home-option-stamp">CHAT</span>
          </span>
          <span className="home-option-number" aria-hidden="true">01</span>
          <span className="home-option-title">Conversation</span>
          <span className="home-option-action">
            OPEN CHAT <span aria-hidden="true">+</span>
          </span>
        </Link>

        <Link className="home-option home-option-triage" href="/triage">
          <span className="home-option-topline">
            <span>CHANNEL / 02</span>
            <span className="home-option-stamp">TICKET</span>
          </span>
          <span className="home-option-number" aria-hidden="true">02</span>
          <span className="home-option-title">Ticket triage</span>
          <span className="home-option-action">
            OPEN TRIAGE <span aria-hidden="true">+</span>
          </span>
        </Link>

        <Link className="home-option home-option-v2" href="/triage-v2">
          <span className="home-option-topline">
            <span>CHANNEL / 03</span>
            <span className="home-option-stamp">JSON + ZOD</span>
          </span>
          <span className="home-option-number" aria-hidden="true">03</span>
          <span className="home-option-title">Triage V2</span>
          <span className="home-option-action">
            OPEN TRIAGE V2 <span aria-hidden="true">+</span>
          </span>
        </Link>
      </nav>

      <footer className="home-footer">
        <span>SUPPORT SYSTEMS</span>
        <span>WORKSPACE / 01</span>
      </footer>
    </main>
  );
}
