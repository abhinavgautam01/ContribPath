import { and, count, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { agentJobs, discoveredIssues, discoveredRepos, users } from "@/lib/db/schema";
import type { AgentJob } from "@/lib/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const inFlightJobStatuses = ["queued", "running"] as const;
export const accountDeletionJobCancellationError = "Account deleted before job completed.";

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

export function accountDeletionJobCancellationPatch(completedAt = new Date()) {
  return {
    status: "cancelled",
    error: accountDeletionJobCancellationError,
    completedAt
  };
}

export function queuedAgentJobCompletionPatch(job: AgentJob) {
  return {
    status: "done",
    resultId: uuidResultId(job.resultId),
    error: null,
    startedAt: new Date(job.createdAt),
    completedAt: job.completedAt ? new Date(job.completedAt) : new Date()
  };
}

export function queuedAgentJobFailurePatch(error: Error, completedAt = new Date()) {
  return {
    status: "failed",
    error: error.message,
    completedAt
  };
}

export async function updateQueuedAgentJob(queueJobId: string | number | undefined | null, patch: ReturnType<typeof queuedAgentJobCompletionPatch> | ReturnType<typeof queuedAgentJobFailurePatch>) {
  const db = getDb();
  if (!db || queueJobId == null) return 0;
  const rows = await db
    .update(agentJobs)
    .set(patch)
    .where(and(eq(agentJobs.queueJobId, String(queueJobId)), inArray(agentJobs.status, [...inFlightJobStatuses])))
    .returning({ id: agentJobs.id });
  return rows.length;
}

export async function markUserInFlightJobsCancelled(userId: string, completedAt = new Date()) {
  const db = getDb();
  if (!db) return 0;
  const rows = await db
    .update(agentJobs)
    .set(accountDeletionJobCancellationPatch(completedAt))
    .where(and(eq(agentJobs.userId, userId), inArray(agentJobs.status, [...inFlightJobStatuses])))
    .returning({ id: agentJobs.id });
  return rows.length;
}

export async function getUserInFlightAgentJobs(userId: string, limit = 5) {
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      queueJobId: agentJobs.queueJobId,
      status: agentJobs.status,
      createdAt: agentJobs.createdAt
    })
    .from(agentJobs)
    .where(and(eq(agentJobs.userId, userId), inArray(agentJobs.status, [...inFlightJobStatuses]), isNotNull(agentJobs.queueJobId)))
    .orderBy(desc(agentJobs.createdAt))
    .limit(limit);
}

export function isResumableJobStatus(status: AgentJob["status"] | null | undefined) {
  return status === "queued" || status === "running";
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
