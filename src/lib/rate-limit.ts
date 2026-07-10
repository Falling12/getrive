import { prisma } from "@/lib/prisma";

export class RateLimitError extends Error {}

// DB-backed sliding-window limiter: RateLimitAttempt rows for `key` created
// within the last `windowMinutes`. Works correctly across multiple
// serverless instances since Postgres is already the single source of
// truth — no Redis/Upstash needed at this scale.

async function countRecent(key: string, windowMinutes: number): Promise<number> {
  const windowStart = new Date(Date.now() - windowMinutes * 60_000);
  return prisma.rateLimitAttempt.count({
    where: { key, createdAt: { gte: windowStart } },
  });
}

async function recordAttempt(key: string): Promise<void> {
  await prisma.rateLimitAttempt.create({ data: { key } });
}

// Checks and records in one step — use when every attempt (success or
// failure) should count toward the limit.
export async function checkRateLimit(
  key: string,
  { max, windowMinutes }: { max: number; windowMinutes: number }
): Promise<void> {
  const count = await countRecent(key, windowMinutes);
  if (count >= max) {
    throw new RateLimitError("Too many attempts. Please try again later.");
  }
  await recordAttempt(key);
}

// Split check/record — use when only *failed* attempts should count, so
// legitimate repeated successful logins never trip the limiter. Call
// assertNotRateLimited() before attempting, then recordFailedAttempt() only
// if the attempt actually fails.
export async function assertNotRateLimited(
  key: string,
  { max, windowMinutes }: { max: number; windowMinutes: number }
): Promise<void> {
  const count = await countRecent(key, windowMinutes);
  if (count >= max) {
    throw new RateLimitError("Too many attempts. Please try again later.");
  }
}

export async function recordFailedAttempt(key: string): Promise<void> {
  await recordAttempt(key);
}
