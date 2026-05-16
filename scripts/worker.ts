require("dotenv").config({ path: ".env" });
import { redis } from "../lib/redis";
import { runPhase1Pipeline } from "../lib/phase1/pipeline";
import { updateJobStatus, insertJobClips } from "../lib/phase2/jobs";
import { getPromptProfile } from "../lib/phase4/profiles";
import { db } from "../lib/db";
import { eq } from "drizzle-orm";
import { jobs } from "../drizzle/schema";

const QUEUE_KEY = "jobs:queue";

async function processJob(jobId: string) {
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
  });

  if (!job) {
    console.error(`Job ${jobId} not found.`);
    return;
  }

  try {
    const promptProfile = job.promptProfileId 
      ? await getPromptProfile({ userId: job.userId, profileId: job.promptProfileId }) 
      : undefined;

    const summary = await runPhase1Pipeline({
      jobId: job.id,
      userId: job.userId,
      url: job.sourceUrl,
      clipCount: 3, // Default values, consider storing in DB if variable
      minSeconds: 30,
      maxSeconds: 60,
      promptProfile,
      onStatus: async (status) => {
        await updateJobStatus(job.id, status);
        await redis.set(`job:${job.id}:status`, status, { ex: 60 * 60 });
      },
    });

    await insertJobClips(
      job.id,
      summary.clips.map((clip) => ({
        ...clip,
        captions: clip.captions,
      }))
    );
    await updateJobStatus(job.id, "completed", {
      durationSeconds: summary.durationSeconds,
      outputRoot: summary.outputRoot,
      errorMessage: null,
    });
    await redis.set(`job:${job.id}:status`, "completed", { ex: 60 * 60 });
  } catch (error) {
    console.error(`Failed to process job ${jobId}:`, error);
    await updateJobStatus(job.id, "failed", {
      errorMessage: error instanceof Error ? error.message : "Pipeline failed",
    });
    await redis.set(`job:${jobId}:status`, "failed", { ex: 60 * 60 });
  }
}

async function runWorker() {
  console.log("Worker started. Waiting for jobs...");
  while (true) {
    const jobId = await redis.lpop(QUEUE_KEY) as string;
    if (!jobId) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }
    console.log(`Processing job: ${jobId}`);
    await processJob(jobId);
  }
}

runWorker().catch(console.error);
