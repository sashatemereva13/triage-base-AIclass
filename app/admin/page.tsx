import Link from "next/link";
import { cookies } from "next/headers";
import { AdminLogin } from "../components/AdminLogin";
import { AdminRunBrowser } from "../components/AdminRunBrowser";
import { listSmokeRuns } from "../../lib/smokeRunStore";
import { ADMIN_SESSION_COOKIE, adminPasswordConfigured, verifyAdminSession } from "../../lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authorized = verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!authorized) return <AdminLogin configured={adminPasswordConfigured()} />;

  const runs = listSmokeRuns();
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
        <p className="triage-eyebrow"><span>05</span> PRIVATE RUN HISTORY</p>
        <h1>Smoke <span>runs.</span></h1>
      </section>
      {runs.length === 0 ? (
        <section className="triage-output"><div className="triage-output-body"><div className="triage-empty-state"><span className="triage-empty-mark" aria-hidden="true">--</span><p>NO RUNS LOGGED</p><span>START A SMOKE TEST TO CREATE THE FIRST RUN</span></div></div></section>
      ) : <AdminRunBrowser runs={runs} />}
      <footer className="triage-footer"><span>SUPPORT SYSTEMS</span><span>ADMIN / RUN HISTORY</span></footer>
    </main>
  );
}
