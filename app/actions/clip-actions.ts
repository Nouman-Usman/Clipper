"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { updateClipCaption, updateClipReviewStatus, upsertPostDraft } from "@/lib/phase3/review";

function requireString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) {
    throw new Error(`${key} is required.`);
  }
  return value;
}

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

export async function saveCaptionAction(formData: FormData) {
  const userId = await requireUserId();
  const clipId = requireString(formData, "clipId");
  const jobId = requireString(formData, "jobId");
  const platform = requireString(formData, "platform");
  const caption = requireString(formData, "caption");

  await updateClipCaption({
    clipId,
    userId,
    platform,
    caption,
  });

  revalidatePath(`/dashboard/runs/${jobId}`);
}

export async function updateReviewStatusAction(formData: FormData) {
  const userId = await requireUserId();
  const clipId = requireString(formData, "clipId");
  const jobId = requireString(formData, "jobId");
  const reviewStatus = requireString(formData, "reviewStatus");

  if (reviewStatus !== "approved" && reviewStatus !== "rejected" && reviewStatus !== "pending") {
    throw new Error("Invalid review status.");
  }

  await updateClipReviewStatus({
    clipId,
    userId,
    reviewStatus,
  });

  revalidatePath(`/dashboard/runs/${jobId}`);
}

export async function savePostDraftAction(formData: FormData) {
  const userId = await requireUserId();
  const clipId = requireString(formData, "clipId");
  const jobId = requireString(formData, "jobId");
  const platform = requireString(formData, "platform");
  const caption = requireString(formData, "caption");
  const scheduledForValue = String(formData.get("scheduledFor") ?? "").trim();
  const scheduledFor = scheduledForValue ? new Date(scheduledForValue) : null;

  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
    throw new Error("Invalid schedule date.");
  }

  await upsertPostDraft({
    clipId,
    userId,
    platform,
    caption,
    scheduledFor,
  });

  revalidatePath(`/dashboard/runs/${jobId}`);
}
