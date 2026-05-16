import { desc, eq, inArray } from "drizzle-orm";

import { clips, jobs, posts } from "@/drizzle/schema";
import { db } from "@/lib/db";

export type JobStatus =
  | "pending"
  | "downloading"
  | "transcribing"
  | "selecting"
  | "cutting"
  | "captioning"
  | "completed"
  | "failed";

export async function createJob(input: { userId: string; sourceUrl: string }) {
  const [job] = await db
    .insert(jobs)
    .values({
      userId: input.userId,
      sourceUrl: input.sourceUrl,
      status: "pending",
    })
    .returning();

  return job;
}

export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  values: Partial<{
    errorMessage: string | null;
    durationSeconds: number | null;
    outputRoot: string | null;
  }> = {}
) {
  await db
    .update(jobs)
    .set({
      status,
      ...values,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));
}

export async function insertJobClips(
  jobId: string,
  generatedClips: Array<{
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    reason: string;
    fileName: string;
    publicPath: string;
    captions: Record<string, string>;
  }>
) {
  if (!generatedClips.length) {
    return [];
  }

  return db
    .insert(clips)
    .values(
      generatedClips.map((clip) => ({
        jobId,
        startSeconds: clip.startSeconds,
        endSeconds: clip.endSeconds,
        durationSeconds: clip.durationSeconds,
        reason: clip.reason,
        summary: clip.reason,
        fileName: clip.fileName,
        publicPath: clip.publicPath,
        captionsJson: clip.captions,
      }))
    )
    .returning();
}

export async function listJobsForUser(userId: string) {
  return db
    .select({
      id: jobs.id,
      sourceUrl: jobs.sourceUrl,
      status: jobs.status,
      errorMessage: jobs.errorMessage,
      durationSeconds: jobs.durationSeconds,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .where(eq(jobs.userId, userId))
    .orderBy(desc(jobs.createdAt))
    .limit(20);
}

export async function getJobWithClips(input: { jobId: string; userId: string }) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.id, input.jobId))
    .limit(1);

  if (!job || job.userId !== input.userId) {
    return null;
  }

  const jobClips = await db
    .select()
    .from(clips)
    .where(eq(clips.jobId, input.jobId))
    .orderBy(clips.createdAt);

  const postRows = jobClips.length
    ? await db
        .select()
        .from(posts)
        .where(inArray(posts.clipId, jobClips.map((clip) => clip.id)))
    : [];

  return {
    job,
    clips: jobClips,
    posts: postRows,
  };
}
