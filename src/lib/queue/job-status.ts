import { getAgentQueue } from "@/lib/queue/jobs";
import type { AgentJob } from "@/lib/types";

function isAgentJob(value: unknown): value is AgentJob {
  return typeof value === "object" && value !== null && "type" in value && "status" in value && "stage" in value && "progress" in value;
}

export async function getQueuedAgentJob(jobId: string): Promise<AgentJob | null> {
  const queue = getAgentQueue();
  if (!queue) return null;
  const job = await queue.getJob(jobId);
  if (!job) return null;

  if (isAgentJob(job.returnvalue)) return job.returnvalue;

  const state = await job.getState();
  const progress = typeof job.progress === "number" ? job.progress : 0;
  const type = job.name as AgentJob["type"];
  return {
    id: String(job.id),
    type,
    status: state === "completed" ? "done" : state === "failed" ? "failed" : state === "active" ? "running" : "queued",
    stage: state === "active" ? "Worker processing job" : state === "failed" ? "Job failed" : "Queued for worker",
    progress,
    error: job.failedReason,
    createdAt: new Date(job.timestamp).toISOString(),
    completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined
  };
}
