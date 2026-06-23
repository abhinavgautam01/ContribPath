import IORedis from "ioredis";
import { env, hasCacheRedis, hasQueueRedis } from "@/lib/env";

let cacheRedis: IORedis | null = null;
let queueRedis: IORedis | null = null;

export function getCacheRedis() {
  if (!hasCacheRedis()) return null;
  cacheRedis ??= new IORedis(env.CACHE_REDIS_URL!, { maxRetriesPerRequest: 2 });
  return cacheRedis;
}

export function getQueueRedis() {
  if (!hasQueueRedis()) return null;
  queueRedis ??= new IORedis(env.QUEUE_REDIS_URL!, { maxRetriesPerRequest: null });
  return queueRedis;
}
