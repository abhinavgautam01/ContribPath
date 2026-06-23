import { eq } from "drizzle-orm";
import { mapIssue, mapPlan, mapRepository, mapSkillProfile } from "@/lib/db/app-data";
import { getDb } from "@/lib/db/client";
import { agentJobs, discoveredIssues, discoveredRepos, implementationPlans, oauthAccounts, skillProfiles, users } from "@/lib/db/schema";
import type { AppState } from "@/lib/types";

type UserRow = typeof users.$inferSelect;
type SkillProfileRow = typeof skillProfiles.$inferSelect;
type RepoRow = typeof discoveredRepos.$inferSelect;
type IssueRow = typeof discoveredIssues.$inferSelect;
type PlanRow = typeof implementationPlans.$inferSelect;
type JobRow = typeof agentJobs.$inferSelect;

type OAuthExportRow = Pick<
  typeof oauthAccounts.$inferSelect,
  "id" | "provider" | "providerAccountId" | "scope" | "tokenType" | "expiresAt" | "revokedAt" | "createdAt" | "updatedAt"
>;

function isoDate(value: Date | null | undefined) {
  return value?.toISOString() ?? null;
}

export function buildAccountExport(input: {
  exportedAt?: Date;
  user: UserRow | null;
  oauthAccounts: OAuthExportRow[];
  skillProfiles: SkillProfileRow[];
  discoveredRepos: RepoRow[];
  discoveredIssues: IssueRow[];
  implementationPlans: PlanRow[];
  agentJobs: JobRow[];
}) {
  const skillProfileExports = input.skillProfiles.map(mapSkillProfile);

  return {
    exportedAt: (input.exportedAt ?? new Date()).toISOString(),
    user: input.user
      ? {
          id: input.user.id,
          githubId: input.user.githubId,
          githubLogin: input.user.githubLogin,
          email: input.user.email,
          avatarUrl: input.user.avatarUrl,
          role: input.user.role,
          createdAt: isoDate(input.user.createdAt),
          updatedAt: isoDate(input.user.updatedAt),
          deletedAt: isoDate(input.user.deletedAt)
        }
      : null,
    oauthAccounts: input.oauthAccounts.map((account) => ({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      scope: account.scope,
      tokenType: account.tokenType,
      expiresAt: isoDate(account.expiresAt),
      revokedAt: isoDate(account.revokedAt),
      createdAt: isoDate(account.createdAt),
      updatedAt: isoDate(account.updatedAt)
    })),
    profile: skillProfileExports[0] ?? null,
    skillProfiles: skillProfileExports,
    repos: input.discoveredRepos.map(mapRepository),
    issues: input.discoveredIssues.map(mapIssue),
    plans: input.implementationPlans.map(mapPlan),
    jobs: input.agentJobs.map((job) => ({
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      queueJobId: job.queueJobId,
      resultId: job.resultId,
      inputPayload: job.inputPayload,
      error: job.error,
      startedAt: isoDate(job.startedAt),
      completedAt: isoDate(job.completedAt),
      createdAt: isoDate(job.createdAt)
    }))
  };
}

export function buildDemoAccountExport(state: AppState, exportedAt = new Date()) {
  return {
    exportedAt: exportedAt.toISOString(),
    user: {
      id: state.user.id,
      githubId: null,
      githubLogin: state.user.githubLogin,
      email: null,
      avatarUrl: state.user.avatarUrl,
      role: state.user.role,
      createdAt: null,
      updatedAt: null,
      deletedAt: null
    },
    oauthAccounts: [],
    profile: state.profile,
    skillProfiles: [state.profile],
    repos: state.repos,
    issues: state.issues,
    plans: Object.values(state.plans),
    jobs: Object.values(state.jobs).map((job) => ({
      id: job.id,
      jobType: job.type,
      status: job.status,
      queueJobId: job.id,
      resultId: job.resultId ?? null,
      inputPayload: null,
      error: job.error ?? null,
      startedAt: job.status === "queued" ? null : job.createdAt,
      completedAt: job.completedAt ?? null,
      createdAt: job.createdAt
    }))
  };
}

export async function exportUserData(userId: string) {
  const db = getDb();
  if (!db) return null;

  const [userRows, oauthRows, profileRows, repoRows, issueRows, planRows, jobRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)),
    db
      .select({
        id: oauthAccounts.id,
        provider: oauthAccounts.provider,
        providerAccountId: oauthAccounts.providerAccountId,
        scope: oauthAccounts.scope,
        tokenType: oauthAccounts.tokenType,
        expiresAt: oauthAccounts.expiresAt,
        revokedAt: oauthAccounts.revokedAt,
        createdAt: oauthAccounts.createdAt,
        updatedAt: oauthAccounts.updatedAt
      })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId)),
    db.select().from(skillProfiles).where(eq(skillProfiles.userId, userId)),
    db.select().from(discoveredRepos).where(eq(discoveredRepos.userId, userId)),
    db.select().from(discoveredIssues).where(eq(discoveredIssues.userId, userId)),
    db.select().from(implementationPlans).where(eq(implementationPlans.userId, userId)),
    db.select().from(agentJobs).where(eq(agentJobs.userId, userId))
  ]);

  return buildAccountExport({
    user: userRows[0] ?? null,
    oauthAccounts: oauthRows,
    skillProfiles: profileRows,
    discoveredRepos: repoRows,
    discoveredIssues: issueRows,
    implementationPlans: planRows,
    agentJobs: jobRows
  });
}

export async function deleteUserData(userId: string) {
  const db = getDb();
  if (!db) return false;
  await db.delete(users).where(eq(users.id, userId));
  return true;
}
