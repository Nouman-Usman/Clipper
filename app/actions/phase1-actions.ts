"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { parsePhase1Form, runPhase1Pipeline } from "@/lib/phase1/pipeline";

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

  try {
    const input = parsePhase1Form(formData);
    const summary = await runPhase1Pipeline({
      userId: session.user.id,
      ...input,
    });

    redirect(`/dashboard/runs/${summary.runId}`);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      redirect("/login");
    }

    const message = encodeURIComponent(errorMessage(error));
    redirect(`/dashboard?phase1Error=${message}`);
  }
}
