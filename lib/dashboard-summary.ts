import { eq } from "drizzle-orm";

import { users } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

const DASHBOARD_TTL_SECONDS = 90;

type DashboardSummary = {
  userId: string;
  email: string;
  fullName: string | null;
  generatedAt: string;
};

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const key = `dashboard:${userId}:summary`;
  const cached = await redis.get<DashboardSummary>(key);

  if (cached) {
    return cached;
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found for dashboard summary");
  }

  const payload: DashboardSummary = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    generatedAt: new Date().toISOString(),
  };

  await redis.set(key, payload, { ex: DASHBOARD_TTL_SECONDS });
  return payload;
}
