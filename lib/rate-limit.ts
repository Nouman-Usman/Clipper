import { redis } from "@/lib/redis";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

function keyForIp(ip: string) {
  return `rl:login:${ip}`;
}

export async function checkLoginRateLimit(ip: string) {
  const key = keyForIp(ip);
  const attempts = await redis.incr(key);

  if (attempts === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  const allowed = attempts <= MAX_ATTEMPTS;
  return {
    allowed,
    remaining: Math.max(0, MAX_ATTEMPTS - attempts),
    retryAfterSeconds: allowed ? 0 : WINDOW_SECONDS,
  };
}

export async function clearLoginRateLimit(ip: string) {
  await redis.del(keyForIp(ip));
}
