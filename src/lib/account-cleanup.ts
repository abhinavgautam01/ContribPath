import type { Job } from "bullmq";
import { getAgentQueue } from "@/lib/queue/jobs";
import { getCacheRedis, getQueueRedis } from "@/lib/queue/redis";

export function getUserRedisKeyPatterns(userId: string) {
  return [`user:${userId}:*`, `profile:${userId}:*`, `issues:${userId}:*`, `repos:${userId}:*`, `rate:${userId}:*`];
}

async function deleteKeysByPattern(patterns: string[]) {
  const redis = getCacheRedis();
  if (!redis) return 0;

  let deleted = 0;
  for (const pattern of patterns) {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length) {
        deleted += await redis.del(...keys);
      }
    } while (cursor !== "0");
  }
  return deleted;
}

async function removeQueueJob(job: Job) {
  await job.remove().catch(async () => {
    await job.discard();
  });
  return true;
}

export async function cleanupUserRuntimeData(userId: string) {
  const cacheKeysDeleted = await deleteKeysByPattern(getUserRedisKeyPatterns(userId));
  const queue = getAgentQueue();
  const queueRedis = getQueueRedis();
  let queueJobsRemoved = 0;

  if (queue && queueRedis) {
    const jobs = await queue.getJobs(["waiting", "delayed", "paused", "prioritized", "active"], 0, 500, false);
    for (const job of jobs) {
      if (job.data?.userId === userId) {
        const removed = await removeQueueJob(job);
        if (removed) queueJobsRemoved += 1;
      }
    }
  }

  return {
    cacheKeysDeleted,
    queueJobsRemoved
  };
}
