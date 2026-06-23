import { count } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { agentJobs, discoveredIssues, discoveredRepos, users } from "@/lib/db/schema";
import type { AgentJob } from "@/lib/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uuidResultId(value: string | undefined) {
  return value && uuidPattern.test(value) ? value : null;
}

export async function persistAgentJob(userId: string, job: AgentJob, inputPayload?: Record<string, unknown>) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .insert(agentJobs)
    .values({
      userId,
      jobType: job.type,
      status: job.status,
      queueJobId: job.id,
      resultId: uuidResultId(job.resultId),
      inputPayload: inputPayload ?? null,
      error: job.error ?? null,
      startedAt: job.status === "queued" ? null : new Date(job.createdAt),
      completedAt: job.completedAt ? new Date(job.completedAt) : null,
      createdAt: new Date(job.createdAt)
    })
    .returning();
  return row ?? null;
}

export async function persistQueuedAgentJob(
  userId: string,
  jobType: AgentJob["type"],
  queueJobId: string,
  inputPayload?: Record<string, unknown>
) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .insert(agentJobs)
    .values({
      userId,
      jobType,
      status: "queued",
      queueJobId,
      inputPayload: inputPayload ?? null
    })
    .returning();
  return row ?? null;
}

async function tableCount(table: typeof users | typeof discoveredRepos | typeof discoveredIssues | typeof agentJobs) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db.select({ value: count() }).from(table);
  return row?.value ?? 0;
}

export async function getAdminMetrics() {
  const db = getDb();
  if (!db) return null;
  const [userCount, repoCount, issueCount, jobCount] = await Promise.all([
    tableCount(users),
    tableCount(discoveredRepos),
    tableCount(discoveredIssues),
    tableCount(agentJobs)
  ]);
  return {
    users: userCount ?? 0,
    repos: repoCount ?? 0,
    issues: issueCount ?? 0,
    jobs: jobCount ?? 0
  };
}
