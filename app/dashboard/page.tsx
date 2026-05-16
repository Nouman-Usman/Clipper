import { redirect } from "next/navigation";

import { runPhase1Action } from "@/app/actions/phase1-actions";
import { auth, signOut } from "@/auth";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { getPhase1EnvironmentStatus } from "@/lib/phase1/pipeline";
import { listJobsForUser } from "@/lib/phase2/jobs";
import { redis } from "@/lib/redis";

type DashboardPageProps = {
  searchParams: Promise<{ phase1Error?: string; jobId?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.sid) {
    const sessionKey = `session:${session.user.sid}`;
    await redis.set(sessionKey, session.user.id, { ex: 24 * 60 * 60 });
  }

  const summary = await getDashboardSummary(session.user.id);
  const environment = await getPhase1EnvironmentStatus();
  const recentJobs = await listJobsForUser(session.user.id);
  const params = await searchParams;
  const phase1Error = params.phase1Error ? decodeURIComponent(params.phase1Error) : null;

  return (
    <main className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-kicker">Phase 1</p>
          <h1>Local clip pipeline</h1>
          <p>Submit a YouTube URL, transcribe it with Groq Whisper, select moments with Gemini, and save vertical clips locally.</p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="secondary-button" type="submit">Sign out</button>
        </form>
      </div>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <p>User</p>
          <strong>{summary.email}</strong>
        </article>
        <article className="dashboard-card">
          <p>Session user ID</p>
          <strong>{summary.userId}</strong>
        </article>
        <article className="dashboard-card">
          <p>Summary cache</p>
          <strong>{new Date(summary.generatedAt).toLocaleTimeString()}</strong>
        </article>
      </section>

      <section className="phase1-layout">
        <form action={runPhase1Action} className="phase1-panel">
          <div>
            <p className="dashboard-kicker">Run pipeline</p>
            <h2>YouTube to local vertical clips</h2>
          </div>

          {phase1Error ? (
            <p className="phase1-error">
              {phase1Error}
              {params.jobId ? <span> Job saved as {params.jobId}.</span> : null}
            </p>
          ) : null}

          <label>
            YouTube URL
            <input name="url" placeholder="https://www.youtube.com/watch?v=..." required type="url" />
          </label>

          <div className="phase1-controls">
            <label>
              Clips
              <input defaultValue="3" max="5" min="1" name="clipCount" type="number" />
            </label>
            <label>
              Min seconds
              <input defaultValue="30" min="10" name="minSeconds" type="number" />
            </label>
            <label>
              Max seconds
              <input defaultValue="60" min="15" name="maxSeconds" type="number" />
            </label>
          </div>

          <button className="primary-button" disabled={!environment.ok} type="submit">
            Run Phase 1
          </button>
        </form>

        <aside className="phase1-panel">
          <div>
            <p className="dashboard-kicker">Environment</p>
            <h2>Local readiness</h2>
          </div>
          <div className="phase1-checks">
            {environment.checks.map((check) => (
              <div key={check.name} className={check.ok ? "phase1-check ok" : "phase1-check"}>
                <span>{check.name}</span>
                <strong>{check.ok ? "Ready" : "Missing"}</strong>
                <p>{check.detail}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="jobs-panel">
        <div className="jobs-panel-header">
          <div>
            <p className="dashboard-kicker">Jobs</p>
            <h2>Recent runs</h2>
          </div>
        </div>

        <div className="jobs-table">
          {recentJobs.length ? (
            recentJobs.map((job) => (
              <a className="job-row" href={`/dashboard/runs/${job.id}`} key={job.id}>
                <span>{job.status}</span>
                <strong>{job.sourceUrl}</strong>
                <small>{job.errorMessage ?? `${job.durationSeconds ? `${Math.round(job.durationSeconds)}s` : "No duration yet"} · ${new Date(job.createdAt).toLocaleString()}`}</small>
              </a>
            ))
          ) : (
            <p className="empty-state">No jobs yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
