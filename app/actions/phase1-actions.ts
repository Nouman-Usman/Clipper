"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { parsePhase1Form, runPhase1Pipeline } from "@/lib/phase1/pipeline";
import { createJob, insertJobClips, updateJobStatus } from "@/lib/phase2/jobs";
import { getPromptProfile } from "@/lib/phase4/profiles";
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

  const input = parsePhase1Form(formData);
  const promptProfile = await getPromptProfile({
    userId: session.user.id,
    profileId: input.promptProfileId,
  });

  const job = await createJob({
    userId: session.user.id,
    sourceUrl: input.url,
    promptProfileId: promptProfile.id,
  });

  await redis.rpush("jobs:queue", job.id);

  redirect(`/dashboard/runs/${job.id}`);
}
