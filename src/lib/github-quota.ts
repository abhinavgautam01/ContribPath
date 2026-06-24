import { getGitHubAccessTokenForUser } from "@/lib/auth/oauth-persistence";
import { getCacheRedis } from "@/lib/queue/redis";

const quotaCacheTtlMs = 60 * 1000;
export const githubQuotaWarningThreshold = 500;

export type GitHubQuotaSnapshot = {
  limit: number;
  remaining: number;
  used: number;
  resetAt: string;
  checkedAt: string;
  warning: boolean;
  source: "live" | "cached";
};

type CachedQuotaSnapshot = Omit<GitHubQuotaSnapshot, "source">;

const memoryQuotaCache = new Map<string, { snapshot: CachedQuotaSnapshot; expiresAt: number }>();

function quotaCacheKey(userId: string) {
  return `github-quota:${userId}`;
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function snapshotFromCoreRate(coreRate: Record<string, unknown>, now: number): GitHubQuotaSnapshot | null {
  const limit = numberOrNull(coreRate.limit);
  const remaining = numberOrNull(coreRate.remaining);
  const reset = numberOrNull(coreRate.reset);
  if (limit === null || remaining === null || reset === null) return null;
  const used = numberOrNull(coreRate.used) ?? Math.max(0, limit - remaining);
  return {
    limit,
    remaining,
    used,
    resetAt: new Date(reset * 1000).toISOString(),
    checkedAt: new Date(now).toISOString(),
    warning: remaining < githubQuotaWarningThreshold,
    source: "live"
  };
}

export function parseGitHubQuotaPayload(payload: unknown, now = Date.now()): GitHubQuotaSnapshot | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const resources = record.resources;
  const core =
    typeof resources === "object" && resources !== null && "core" in resources
      ? (resources as Record<string, unknown>).core
      : record.rate;
  if (typeof core !== "object" || core === null) return null;
  return snapshotFromCoreRate(core as Record<string, unknown>, now);
}

function restoreCachedSnapshot(value: unknown): GitHubQuotaSnapshot | null {
  if (typeof value !== "object" || value === null) return null;
  const cached = value as Record<string, unknown>;
  const limit = numberOrNull(cached.limit);
  const remaining = numberOrNull(cached.remaining);
  const used = numberOrNull(cached.used);
  if (
    limit === null ||
    remaining === null ||
    used === null ||
    typeof cached.resetAt !== "string" ||
    typeof cached.checkedAt !== "string" ||
    typeof cached.warning !== "boolean"
  ) {
    return null;
  }
  return {
    limit,
    remaining,
    used,
    resetAt: cached.resetAt,
    checkedAt: cached.checkedAt,
    warning: cached.warning,
    source: "cached"
  };
}

async function readCachedQuota(userId: string, now: number) {
  const key = quotaCacheKey(userId);
  const memory = memoryQuotaCache.get(key);
  if (memory && memory.expiresAt > now) return { ...memory.snapshot, source: "cached" as const };

  const redis = getCacheRedis();
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return restoreCachedSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeCachedQuota(userId: string, snapshot: GitHubQuotaSnapshot, now: number) {
  const key = quotaCacheKey(userId);
  const cached: CachedQuotaSnapshot = {
    limit: snapshot.limit,
    remaining: snapshot.remaining,
    used: snapshot.used,
    resetAt: snapshot.resetAt,
    checkedAt: snapshot.checkedAt,
    warning: snapshot.warning
  };
  memoryQuotaCache.set(key, { snapshot: cached, expiresAt: now + quotaCacheTtlMs });

  const redis = getCacheRedis();
  if (redis) {
    await redis.set(key, JSON.stringify(cached), "PX", quotaCacheTtlMs);
  }
}

export async function getGitHubQuotaForUser(userId: string | null | undefined, now = Date.now()) {
  if (!userId || userId === "user_demo") return null;

  const cached = await readCachedQuota(userId, now);
  if (cached) return cached;

  const token = await getGitHubAccessTokenForUser(userId);
  if (!token) return null;

  const response = await fetch("https://api.github.com/rate_limit", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "contribpath-quota"
    }
  });
  if (!response.ok) return null;

  const snapshot = parseGitHubQuotaPayload(await response.json(), now);
  if (!snapshot) return null;
  await writeCachedQuota(userId, snapshot, now);
  return snapshot;
}
