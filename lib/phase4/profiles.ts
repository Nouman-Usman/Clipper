import { desc, eq } from "drizzle-orm";

import { promptProfiles } from "@/drizzle/schema";
import { db } from "@/lib/db";

const defaultInstructions =
  "Prioritize podcast moments with a clear hook, complete standalone thought, useful takeaway, and natural ending. Avoid rambling setup, inside jokes without context, and clips that require the full episode to understand.";

export async function ensureDefaultPromptProfile(userId: string) {
  const existing = await listPromptProfiles(userId);
  if (existing.length) {
    return existing[0];
  }

  const [profile] = await db
    .insert(promptProfiles)
    .values({
      userId,
      name: "Podcast default",
      niche: "podcasters",
      instructions: defaultInstructions,
    })
    .returning();

  return profile;
}

export async function listPromptProfiles(userId: string) {
  return db
    .select()
    .from(promptProfiles)
    .where(eq(promptProfiles.userId, userId))
    .orderBy(desc(promptProfiles.createdAt));
}

export async function createPromptProfile(input: {
  userId: string;
  name: string;
  niche: string;
  instructions: string;
}) {
  await db.insert(promptProfiles).values({
    userId: input.userId,
    name: input.name.trim(),
    niche: input.niche.trim() || "podcasters",
    instructions: input.instructions.trim(),
  });
}

export async function getPromptProfile(input: { userId: string; profileId?: string | null }) {
  if (!input.profileId) {
    return ensureDefaultPromptProfile(input.userId);
  }

  const [profile] = await db
    .select()
    .from(promptProfiles)
    .where(eq(promptProfiles.id, input.profileId))
    .limit(1);

  if (!profile || profile.userId !== input.userId) {
    return ensureDefaultPromptProfile(input.userId);
  }

  return profile;
}
