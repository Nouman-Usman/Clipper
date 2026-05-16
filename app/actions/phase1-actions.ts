"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { parsePhase1Form, runPhase1Pipeline } from "@/lib/phase1/pipeline";
import { createJob, insertJobClips, updateJobStatus } from "@/lib/phase2/jobs";
import { redis } from "@/lib/redis";

function isNextRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Phase 1 processing failed.";
}

export async function runPhase1Action(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  let jobId: string | null = null;

  try {
    const input = parsePhase1Form(formData);
    const job = await createJob({
      userId: session.user.id,
      sourceUrl: input.url,
    });
    jobId = job.id;

    const summary = await runPhase1Pipeline({
      jobId: job.id,
      userId: session.user.id,
      ...input,
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

    redirect(`/dashboard/runs/${job.id}`);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      redirect("/login");
    }

    if (jobId) {
      await updateJobStatus(jobId, "failed", {
        errorMessage: errorMessage(error),
      });
      await redis.set(`job:${jobId}:status`, "failed", { ex: 60 * 60 });
    }

    const message = encodeURIComponent(errorMessage(error));
    const jobParam = jobId ? `&jobId=${jobId}` : "";
    redirect(`/dashboard?phase1Error=${message}${jobParam}`);
  }
}
