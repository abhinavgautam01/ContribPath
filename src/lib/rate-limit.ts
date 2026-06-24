import { getCacheRedis } from "@/lib/queue/redis";

export type RateLimitAction = "anonymous_api" | "profile_analysis" | "issue_discovery" | "issue_explanation" | "plan_generation" | "pr_draft";

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  timestamps: number[];
};

export type RateLimitResult = {
  limited: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetAt: string;
};

const rules: Record<RateLimitAction, RateLimitRule> = {
  anonymous_api: { limit: 10, windowMs: 60 * 1000 },
  profile_analysis: { limit: 1, windowMs: 60 * 60 * 1000 },
  issue_discovery: { limit: 3, windowMs: 24 * 60 * 60 * 1000 },
  issue_explanation: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  plan_generation: { limit: 10, windowMs: 24 * 60 * 60 * 1000 },
  pr_draft: { limit: 20, windowMs: 24 * 60 * 60 * 1000 }
};

const memoryBuckets = new Map<string, Bucket>();

export function getRateLimitRule(action: RateLimitAction) {
  return rules[action];
}

export function buildRateLimitKey(action: RateLimitAction, identity: string) {
  return `rate:${identity}:${action}`;
}

export function getClientIpIdentity(request: Request | undefined, fallbackIdentity: string) {
  if (!request) return fallbackIdentity;
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  return `ip:${forwardedFor || realIp || cloudflareIp || fallbackIdentity}`;
}

export function applySlidingWindowLimit(bucket: Bucket | undefined, rule: RateLimitRule, now = Date.now()) {
  const windowStart = now - rule.windowMs;
  const timestamps = (bucket?.timestamps ?? []).filter((timestamp) => timestamp > windowStart);
  timestamps.push(now);

  const count = timestamps.length;
  const oldestRelevantRequest = timestamps[0] ?? now;
  const retryAfter = count > rule.limit ? Math.max(0, Math.ceil((oldestRelevantRequest + rule.windowMs - now) / 1000)) : 0;
  const resetAt = count > rule.limit ? oldestRelevantRequest + rule.windowMs : now + rule.windowMs;

  return {
    bucket: { timestamps },
    result: {
      limited: count > rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfter,
      resetAt: new Date(resetAt).toISOString()
    } satisfies RateLimitResult
  };
}

export async function checkRateLimit(action: RateLimitAction, identity: string) {
  const rule = getRateLimitRule(action);
  const key = buildRateLimitKey(action, identity);
  const redis = getCacheRedis();
  const now = Date.now();

  if (redis) {
    const windowStart = now - rule.windowMs;
    const member = `${now}:${Math.random().toString(36).slice(2)}`;
    await redis.zremrangebyscore(key, 0, windowStart);
    await redis.zadd(key, now, member);
    await redis.pexpire(key, rule.windowMs);

    const count = await redis.zcard(key);
    const oldest = count > rule.limit ? await redis.zrange(key, 0, 0, "WITHSCORES") : [];
    const oldestTimestamp = Number(oldest[1] ?? now);
    const retryAfter = count > rule.limit ? Math.max(0, Math.ceil((oldestTimestamp + rule.windowMs - now) / 1000)) : 0;
    const resetAt = count > rule.limit ? oldestTimestamp + rule.windowMs : now + rule.windowMs;

    return {
      limited: count > rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfter,
      resetAt: new Date(resetAt).toISOString()
    } satisfies RateLimitResult;
  }

  const current = memoryBuckets.get(key);
  const { bucket, result } = applySlidingWindowLimit(current, rule, now);
  memoryBuckets.set(key, bucket);
  return result;
}
