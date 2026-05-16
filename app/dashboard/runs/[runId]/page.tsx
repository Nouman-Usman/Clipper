import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { saveCaptionAction, savePostDraftAction, updateReviewStatusAction } from "@/app/actions/clip-actions";
import { auth } from "@/auth";
import { getJobWithClips } from "@/lib/phase2/jobs";
import { platformLabel, platforms } from "@/lib/platforms";

type RunPageProps = {
  params: Promise<{ runId: string }>;
};

export default async function RunPage({ params }: RunPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { runId } = await params;

  const result = await getJobWithClips({
    jobId: runId,
    userId: session.user.id,
  });

  if (!result) {
    notFound();
  }

  const { job, clips, posts } = result;

  return (
    <main className="dashboard-shell">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-kicker">Phase 2 persisted job</p>
          <h1>{job.status === "completed" ? `${clips.length} vertical clips saved` : `Job ${job.status}`}</h1>
          <p>{job.sourceUrl}</p>
        </div>
        <Link className="secondary-button" href="/dashboard">New run</Link>
      </div>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <p>Job ID</p>
          <strong>{job.id}</strong>
        </article>
        <article className="dashboard-card">
          <p>Status</p>
          <strong>{job.status}</strong>
        </article>
        <article className="dashboard-card">
          <p>Created</p>
          <strong>{new Date(job.createdAt).toLocaleString()}</strong>
        </article>
      </section>

      {job.errorMessage ? <p className="phase1-error">{job.errorMessage}</p> : null}

      <section className="clip-results">
        {clips.map((clip, index) => (
          <article className="clip-result" key={clip.fileName}>
            <video controls preload="metadata" src={clip.publicPath} />
            <div>
              <p className="dashboard-kicker">Clip {index + 1}</p>
              <h2>{clip.durationSeconds}s vertical export</h2>
              <p>{clip.reason}</p>
              <div className="review-actions">
                <span>{clip.reviewStatus}</span>
                {(["approved", "rejected", "pending"] as const).map((reviewStatus) => (
                  <form action={updateReviewStatusAction} key={reviewStatus}>
                    <input name="clipId" type="hidden" value={clip.id} />
                    <input name="jobId" type="hidden" value={job.id} />
                    <input name="reviewStatus" type="hidden" value={reviewStatus} />
                    <button type="submit">{reviewStatus}</button>
                  </form>
                ))}
              </div>
              <dl>
                <div>
                  <dt>Start</dt>
                  <dd>{clip.startSeconds}s</dd>
                </div>
                <div>
                  <dt>End</dt>
                  <dd>{clip.endSeconds}s</dd>
                </div>
                <div>
                  <dt>File</dt>
                  <dd>{clip.fileName}</dd>
                </div>
              </dl>
              <a className="primary-button" download href={clip.publicPath}>Download clip</a>
              <div className="caption-grid">
                {platforms.map((platform) => {
                  const caption = clip.captionsJson[platform.key] ?? "";
                  const post = posts.find((item) => item.clipId === clip.id && item.platform === platform.key);

                  return (
                  <section key={platform.key}>
                    <h3>{platformLabel(platform.key)}</h3>
                    <form action={saveCaptionAction}>
                      <input name="clipId" type="hidden" value={clip.id} />
                      <input name="jobId" type="hidden" value={job.id} />
                      <input name="platform" type="hidden" value={platform.key} />
                      <textarea name="caption" rows={4} defaultValue={caption} />
                      <button type="submit">Save caption</button>
                    </form>
                    <form action={savePostDraftAction}>
                      <input name="clipId" type="hidden" value={clip.id} />
                      <input name="jobId" type="hidden" value={job.id} />
                      <input name="platform" type="hidden" value={platform.key} />
                      <input name="caption" type="hidden" value={caption} />
                      <label>
                        Schedule
                        <input name="scheduledFor" type="datetime-local" />
                      </label>
                      <button type="submit">{post ? "Update draft" : "Create draft"}</button>
                    </form>
                    {post ? (
                      <p className="post-state">
                        {post.status}
                        {post.scheduledFor ? ` for ${new Date(post.scheduledFor).toLocaleString()}` : ""}
                      </p>
                    ) : null}
                  </section>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
        {!clips.length ? <p className="empty-state">No clips have been saved for this job yet.</p> : null}
      </section>
    </main>
  );
}
