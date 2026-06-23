import { getCacheRedis } from "@/lib/queue/redis";

export type RateLimitAction = "anonymous_api" | "profile_analysis" | "issue_discovery" | "issue_explanation" | "plan_generation" | "pr_draft";

export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
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

export function applyFixedWindowLimit(bucket: Bucket | undefined, rule: RateLimitRule, now = Date.now()) {
  const activeBucket = !bucket || bucket.resetAt <= now ? { count: 0, resetAt: now + rule.windowMs } : bucket;
  const count = activeBucket.count + 1;
  const nextBucket = { ...activeBucket, count };
  const retryAfter = Math.max(0, Math.ceil((nextBucket.resetAt - now) / 1000));
  return {
    bucket: nextBucket,
    result: {
      limited: count > rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfter,
      resetAt: new Date(nextBucket.resetAt).toISOString()
    } satisfies RateLimitResult
  };
}

export async function checkRateLimit(action: RateLimitAction, identity: string) {
  const rule = getRateLimitRule(action);
  const key = buildRateLimitKey(action, identity);
  const redis = getCacheRedis();
  const now = Date.now();

  if (redis) {
    const count = await redis.incr(key);
    let ttlMs = await redis.pttl(key);
    if (count === 1 || ttlMs < 0) {
      await redis.pexpire(key, rule.windowMs);
      ttlMs = rule.windowMs;
    }
    const retryAfter = Math.max(0, Math.ceil(ttlMs / 1000));
    return {
      limited: count > rule.limit,
      limit: rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfter,
      resetAt: new Date(now + ttlMs).toISOString()
    } satisfies RateLimitResult;
  }

  const current = memoryBuckets.get(key);
  const { bucket, result } = applyFixedWindowLimit(current, rule, now);
  memoryBuckets.set(key, bucket);
  return result;
}
