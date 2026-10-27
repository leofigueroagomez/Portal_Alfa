import "server-only";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
const MAX_MEMORY_BUCKETS = 10_000;
let nextCleanupAt = 0;

type UpstashCommandResult = {
  result: number | string | null;
  error?: string;
};

async function checkRedisRateLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean | null> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `ratelimit:${key}`;

  try {
    const response = await fetch(`${url.replace(/\/+$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSeconds, "NX"],
      ]),
      // Rate limit calls must be fast and never cached
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as UpstashCommandResult[];
    const currentCount = Number(json?.[0]?.result);
    if (json?.some((item) => item.error) || !Number.isSafeInteger(currentCount) || currentCount < 1) {
      return null;
    }

    return currentCount <= limit;
  } catch {
    // If Redis call fails (e.g. network timeout), return null so we fall back to memory
    return null;
  }
}

export function checkMemoryRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  if (now >= nextCleanupAt) {
    for (const [storedKey, value] of memoryBuckets) {
      if (value.resetAt <= now) memoryBuckets.delete(storedKey);
    }
    nextCleanupAt = now + 60_000;
  }
  const bucket = memoryBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Do not evict live buckets: doing so would reset an attacker's allowance.
    if (!bucket && memoryBuckets.size >= MAX_MEMORY_BUCKETS) return false;
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export async function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): Promise<boolean> {
  const redisUrl =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (redisUrl && redisToken) {
    const redisResult = await checkRedisRateLimit(
      redisUrl,
      redisToken,
      key,
      limit,
      windowMs
    );

    if (redisResult !== null) {
      return redisResult;
    }
  }

  return checkMemoryRateLimit(key, limit, windowMs);
}
