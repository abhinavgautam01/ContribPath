import { createInitialState } from "@/lib/demo-data";
import { applyProfilePreferencePatch, type ProfilePreferencePatch } from "@/lib/profile-preferences";
import type { AgentJob, AppState, ImplementationPlan, Issue, IssueContext, LikelyFile } from "@/lib/types";

const GLOBAL_KEY = "__contribpath_state__";

type GlobalWithState = typeof globalThis & {
  [GLOBAL_KEY]?: AppState;
};

function state(): AppState {
  const globalState = globalThis as GlobalWithState;
  if (!globalState[GLOBAL_KEY]) {
    globalState[GLOBAL_KEY] = createInitialState();
  }
  return globalState[GLOBAL_KEY];
}

export function getState(): AppState {
  return state();
}

export function createJob(type: AgentJob["type"], stage: string): AgentJob {
  const job: AgentJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    status: "queued",
    stage,
    progress: 0,
    createdAt: new Date().toISOString()
  };
  state().jobs[job.id] = job;
  return job;
}

export function findLatestJob(type: AgentJob["type"]): AgentJob | undefined {
  return Object.values(state().jobs)
    .filter((job) => job.type === type)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
}

export function completeJob(jobId: string, stage: string, result: unknown, resultId?: string): AgentJob {
  const job = state().jobs[jobId];
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  job.status = "done";
  job.stage = stage;
  job.progress = 1;
  job.result = result;
  job.resultId = resultId;
  job.completedAt = new Date().toISOString();
  return job;
}

export function setJobRunning(jobId: string, stage: string, progress: number): AgentJob {
  const job = state().jobs[jobId];
  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }
  job.status = "running";
  job.stage = stage;
  job.progress = progress;
  return job;
}

export function findIssue(issueId: string): Issue | undefined {
  return state().issues.find((issue) => issue.id === issueId);
}

export function saveIssue(issueId: string, patch: Partial<Pick<Issue, "saved" | "dismissed">>): Issue | undefined {
  const issue = findIssue(issueId);
  if (!issue) return undefined;
  Object.assign(issue, patch);
  return issue;
}

export function updateIssueExplanation(issueId: string, issueContext: IssueContext, likelyFiles?: LikelyFile[]): Issue | undefined {
  const issue = findIssue(issueId);
  if (!issue) return undefined;
  issue.issueContext = issueContext;
  if (likelyFiles) issue.likelyFiles = likelyFiles;
  issue.explainedAt = new Date().toISOString();
  return issue;
}

export function updateProfilePreferences(patch: ProfilePreferencePatch) {
  const nextProfile = applyProfilePreferencePatch(state().profile, patch);
  state().profile = nextProfile;
  return nextProfile;
}

export function upsertPlan(plan: ImplementationPlan): ImplementationPlan {
  state().plans[plan.issueId] = plan;
  return plan;
}
