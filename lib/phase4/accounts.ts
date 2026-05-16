import { and, eq } from "drizzle-orm";

import { socialAccounts } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { platforms } from "@/lib/platforms";

export async function listSocialAccountStatuses(userId: string) {
  const rows = await db.select().from(socialAccounts).where(eq(socialAccounts.userId, userId));

  return platforms.map((platform) => {
    const account = rows.find((row) => row.platform === platform.key);
    return {
      ...platform,
      status: account?.status ?? "not_connected",
      externalAccountId: account?.externalAccountId ?? null,
      scopes: account?.scopes ?? null,
    };
  });
}

export async function upsertManualSocialAccount(input: { userId: string; platform: string; externalAccountId?: string }) {
  const [existing] = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.userId, input.userId), eq(socialAccounts.platform, input.platform)))
    .limit(1);

  if (existing) {
    await db
      .update(socialAccounts)
      .set({
        status: "manual_ready",
        externalAccountId: input.externalAccountId?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(socialAccounts.id, existing.id));
    return;
  }

  await db.insert(socialAccounts).values({
    userId: input.userId,
    platform: input.platform,
    status: "manual_ready",
    externalAccountId: input.externalAccountId?.trim() || null,
  });
}
