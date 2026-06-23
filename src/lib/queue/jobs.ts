import { Queue } from "bullmq";
import { createHash } from "crypto";
import type { RedisOptions } from "ioredis";
import { persistQueuedAgentJob } from "@/lib/db/job-data";
import { getQueueRedis } from "@/lib/queue/redis";
import type { AgentJob } from "@/lib/types";

let agentQueue: Queue | null = null;

export function getAgentQueue() {
  const connection = getQueueRedis();
  if (!connection) return null;
  agentQueue ??= new Queue("agent-jobs", { connection: connection as unknown as RedisOptions });
  return agentQueue;
}

const priorityByJobType: Record<AgentJob["type"], number> = {
  profile_analysis: 1,
  issue_explanation: 2,
  plan: 2,
  issue_discovery: 3,
  pr_draft: 3
};

export function buildAgentQueueJobId(type: AgentJob["type"], input: Record<string, unknown>) {
  const userId = typeof input.userId === "string" ? input.userId : "anonymous";
  const hash = createHash("sha256").update(stableStringify(input)).digest("hex").slice(0, 16);
  return `${userId}:${type}:${hash}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function enqueueAgentJob(type: AgentJob["type"], input: Record<string, unknown>) {
  const queue = getAgentQueue();
  if (!queue) return null;
  const queueJobId = buildAgentQueueJobId(type, input);
  const job = await queue.add(type, input, {
    jobId: queueJobId,
    priority: priorityByJobType[type],
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 100
  });
  if (typeof input.userId === "string" && input.userId !== "current") {
    await persistQueuedAgentJob(input.userId, type, String(job.id), input);
  }
  return job;
}
