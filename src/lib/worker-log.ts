import type { Job } from "bullmq";
import type { AgentJob } from "@/lib/types";

const agentNameByType: Record<AgentJob["type"], string> = {
  profile_analysis: "SkillAnalysisAgent",
  issue_discovery: "RepositoryDiscoveryAgent",
  issue_explanation: "IssueUnderstandingAgent",
  plan: "ImplementationPlannerAgent",
  pr_draft: "PRDraftAgent"
};

export function agentNameForJobType(type: string) {
  return agentNameByType[type as AgentJob["type"]] ?? "AgentWorker";
}

export function buildWorkerLogEvent(
  job: Pick<Job, "id" | "name" | "timestamp" | "finishedOn" | "data"> | undefined,
  status: "completed" | "failed",
  error?: Error
) {
  const finishedAt = job?.finishedOn ?? Date.now();
  const durationMs = job?.timestamp ? Math.max(0, finishedAt - job.timestamp) : 0;
  const data = job?.data && typeof job.data === "object" ? (job.data as Record<string, unknown>) : {};
  return {
    userId: typeof data.userId === "string" ? data.userId : null,
    jobId: job?.id ? String(job.id) : null,
    agentName: agentNameForJobType(job?.name ?? ""),
    durationMs,
    status,
    error: error?.message ?? null
  };
}
