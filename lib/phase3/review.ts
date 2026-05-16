import { and, eq } from "drizzle-orm";

import { clips, jobs, posts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { isPlatformKey } from "@/lib/platforms";

async function getOwnedClip(input: { clipId: string; userId: string }) {
  const [row] = await db
    .select({
      clip: clips,
      job: jobs,
    })
    .from(clips)
    .innerJoin(jobs, eq(clips.jobId, jobs.id))
    .where(and(eq(clips.id, input.clipId), eq(jobs.userId, input.userId)))
    .limit(1);

  return row?.clip ?? null;
}

export async function updateClipCaption(input: {
  clipId: string;
  userId: string;
  platform: string;
  caption: string;
}) {
  if (!isPlatformKey(input.platform)) {
    throw new Error("Unsupported platform.");
  }

  const clip = await getOwnedClip({ clipId: input.clipId, userId: input.userId });
  if (!clip) {
    throw new Error("Clip not found.");
  }

  const captions = {
    ...clip.captionsJson,
    [input.platform]: input.caption.trim(),
  };

  await db
    .update(clips)
    .set({
      captionsJson: captions,
      updatedAt: new Date(),
    })
    .where(eq(clips.id, input.clipId));
}

export async function updateClipReviewStatus(input: {
  clipId: string;
  userId: string;
  reviewStatus: "approved" | "rejected" | "pending";
}) {
  const clip = await getOwnedClip({ clipId: input.clipId, userId: input.userId });
  if (!clip) {
    throw new Error("Clip not found.");
  }

  await db
    .update(clips)
    .set({
      reviewStatus: input.reviewStatus,
      updatedAt: new Date(),
    })
    .where(eq(clips.id, input.clipId));
}

export async function upsertPostDraft(input: {
  clipId: string;
  userId: string;
  platform: string;
  caption: string;
  scheduledFor?: Date | null;
}) {
  if (!isPlatformKey(input.platform)) {
    throw new Error("Unsupported platform.");
  }

  const clip = await getOwnedClip({ clipId: input.clipId, userId: input.userId });
  if (!clip) {
    throw new Error("Clip not found.");
  }

  const [existing] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.clipId, input.clipId), eq(posts.platform, input.platform)))
    .limit(1);

  if (existing) {
    await db
      .update(posts)
      .set({
        caption: input.caption.trim(),
        scheduledFor: input.scheduledFor ?? null,
        status: input.scheduledFor ? "scheduled" : "draft",
        updatedAt: new Date(),
      })
      .where(eq(posts.id, existing.id));
    return;
  }

  await db.insert(posts).values({
    clipId: input.clipId,
    platform: input.platform,
    caption: input.caption.trim(),
    scheduledFor: input.scheduledFor ?? null,
    status: input.scheduledFor ? "scheduled" : "draft",
  });
}
