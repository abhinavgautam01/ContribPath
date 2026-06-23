import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { discoveredIssues, discoveredRepos, implementationPlans, skillProfiles } from "@/lib/db/schema";
import { applyProfilePreferencePatch, type ProfilePreferencePatch } from "@/lib/profile-preferences";
import type { Difficulty, HealthBreakdown, ImplementationPlan, Issue, IssueExplanationResult, IssueContext, LikelyFile, Repository, SkillProfile } from "@/lib/types";

export async function getStoredSkillProfile(userId: string) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db.select().from(skillProfiles).where(eq(skillProfiles.userId, userId)).limit(1);
  return row ? mapSkillProfile(row) : null;
}

export async function saveSkillProfile(userId: string, profile: SkillProfile) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .insert(skillProfiles)
    .values({
      userId,
      languages: profile.languages,
      frameworks: profile.frameworks,
      difficulty: profile.difficulty,
      preferredDomain: profile.preferredDomain,
      totalRepos: profile.totalRepos,
      totalPrs: profile.totalMergedPRs,
      rawData: profile,
      analyzedAt: new Date(profile.analyzedAt),
      expiresAt: new Date(profile.expiresAt)
    })
    .onConflictDoUpdate({
      target: skillProfiles.userId,
      set: {
        languages: profile.languages,
        frameworks: profile.frameworks,
        difficulty: profile.difficulty,
        preferredDomain: profile.preferredDomain,
        totalRepos: profile.totalRepos,
        totalPrs: profile.totalMergedPRs,
        rawData: profile,
        analyzedAt: new Date(profile.analyzedAt),
        expiresAt: new Date(profile.expiresAt)
      }
    })
    .returning();
  return row ? mapSkillProfile(row) : null;
}

export async function updateStoredSkillPreferences(userId: string, patch: ProfilePreferencePatch) {
  const db = getDb();
  if (!db) return null;
  const [currentRow] = await db.select().from(skillProfiles).where(eq(skillProfiles.userId, userId)).limit(1);
  if (!currentRow) return null;

  const next = applyProfilePreferencePatch(mapSkillProfile(currentRow), patch);
  const rawData = typeof currentRow.rawData === "object" && currentRow.rawData !== null && !Array.isArray(currentRow.rawData) ? currentRow.rawData : {};
  const [row] = await db
    .update(skillProfiles)
    .set({
      difficulty: next.difficulty,
      preferredDomain: next.preferredDomain,
      frameworks: next.frameworks,
      rawData: {
        ...rawData,
        difficulty: next.difficulty,
        preferredDomain: next.preferredDomain,
        frameworks: next.frameworks
      }
    })
    .where(eq(skillProfiles.userId, userId))
    .returning();
  return row ? mapSkillProfile(row) : null;
}

export async function getStoredRepos(userId: string) {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select().from(discoveredRepos).where(eq(discoveredRepos.userId, userId));
  return rows.map(mapRepository);
}

export async function getStoredIssues(userId: string) {
  const db = getDb();
  if (!db) return [];
  const rows = await db.select().from(discoveredIssues).where(eq(discoveredIssues.userId, userId));
  return rows.map(mapIssue);
}

export async function getStoredIssue(userId: string, issueId: string) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(discoveredIssues)
    .where(and(eq(discoveredIssues.userId, userId), eq(discoveredIssues.id, issueId)))
    .limit(1);
  return row ? mapIssue(row) : null;
}

export async function updateStoredIssueFlags(
  userId: string,
  issueId: string,
  patch: Partial<Pick<Issue, "saved" | "dismissed">>
) {
  const db = getDb();
  if (!db) return null;
  const values: Partial<typeof discoveredIssues.$inferInsert> = {};
  if (typeof patch.saved === "boolean") values.saved = patch.saved;
  if (typeof patch.dismissed === "boolean") values.dismissed = patch.dismissed;
  if (!Object.keys(values).length) return getStoredIssue(userId, issueId);

  const [row] = await db
    .update(discoveredIssues)
    .set(values)
    .where(and(eq(discoveredIssues.userId, userId), eq(discoveredIssues.id, issueId)))
    .returning();
  return row ? mapIssue(row) : null;
}

export async function updateStoredIssueExplanation(
  userId: string,
  issueId: string,
  issueContextOrExplanation: IssueContext | IssueExplanationResult,
  likelyFiles?: LikelyFile[]
) {
  const db = getDb();
  if (!db) return null;
  const explanation =
    "issueContext" in issueContextOrExplanation
      ? issueContextOrExplanation
      : {
          issueContext: issueContextOrExplanation,
          likelyFiles
        };
  const values: Partial<typeof discoveredIssues.$inferInsert> = {
    issueContext: explanation.issueContext,
    explainedAt: new Date()
  };
  if (explanation.likelyFiles) values.likelyFiles = explanation.likelyFiles;
  if (explanation.difficulty) values.difficultyEstimate = explanation.difficulty;
  if (explanation.timeEstimateMins) values.timeEstimateMins = explanation.timeEstimateMins;

  const [row] = await db
    .update(discoveredIssues)
    .set(values)
    .where(and(eq(discoveredIssues.userId, userId), eq(discoveredIssues.id, issueId)))
    .returning();
  return row ? mapIssue(row) : null;
}

export async function saveDiscoveryResults(userId: string, repos: Repository[], issues: Issue[]) {
  const db = getDb();
  if (!db) return { repos: [], issues: [] };
  const repoIdByProviderId = new Map<string, string>();
  const savedRepos: Repository[] = [];

  for (const repo of repos) {
    const [row] = await db
      .insert(discoveredRepos)
      .values({
        userId,
        githubRepoId: repo.githubRepoId,
        fullName: repo.fullName,
        description: repo.description,
        language: repo.language,
        stars: repo.stars,
        forks: repo.forks,
        healthScore: repo.healthScore,
        healthBreakdown: repo.healthBreakdown,
        skillMatchScore: repo.skillMatchScore,
        finalScore: repo.finalScore
      })
      .onConflictDoUpdate({
        target: [discoveredRepos.userId, discoveredRepos.githubRepoId],
        set: {
          fullName: repo.fullName,
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          forks: repo.forks,
          healthScore: repo.healthScore,
          healthBreakdown: repo.healthBreakdown,
          skillMatchScore: repo.skillMatchScore,
          finalScore: repo.finalScore,
          metadataExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
          healthExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000)
        }
      })
      .returning();
    repoIdByProviderId.set(repo.id, row.id);
    savedRepos.push(mapRepository(row));
  }

  const savedIssues: Issue[] = [];
  for (const issue of issues) {
    const repoId = repoIdByProviderId.get(issue.repoId) ?? issue.repoId;
    const [row] = await db
      .insert(discoveredIssues)
      .values({
        userId,
        repoId,
        githubIssueNumber: issue.githubIssueNumber,
        githubNodeId: issue.githubNodeId,
        title: issue.title,
        body: issue.body,
        labels: issue.labels,
        difficultyEstimate: issue.difficulty,
        timeEstimateMins: issue.timeEstimateMins,
        aiSummary: issue.aiSummary,
        likelyFiles: issue.likelyFiles,
        issueContext: issue.issueContext,
        explainedAt: issue.explainedAt ? new Date(issue.explainedAt) : null,
        githubUrl: issue.githubUrl,
        state: issue.state,
        saved: issue.saved,
        dismissed: issue.dismissed
      })
      .onConflictDoUpdate({
        target: [discoveredIssues.userId, discoveredIssues.repoId, discoveredIssues.githubIssueNumber],
        set: {
          githubNodeId: issue.githubNodeId,
          title: issue.title,
          body: issue.body,
          labels: issue.labels,
          difficultyEstimate: issue.difficulty,
          timeEstimateMins: issue.timeEstimateMins,
          aiSummary: issue.aiSummary,
          likelyFiles: issue.likelyFiles,
          issueContext: issue.issueContext,
          explainedAt: issue.explainedAt ? new Date(issue.explainedAt) : null,
          githubUrl: issue.githubUrl,
          state: issue.state
        }
      })
      .returning();
    savedIssues.push(mapIssue(row));
  }

  return { repos: savedRepos, issues: savedIssues };
}

export async function getStoredPlan(userId: string, issueId: string) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(implementationPlans)
    .where(and(eq(implementationPlans.userId, userId), eq(implementationPlans.issueId, issueId)))
    .limit(1);
  return row ? mapPlan(row) : null;
}

export async function saveImplementationPlan(userId: string, plan: ImplementationPlan) {
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .insert(implementationPlans)
    .values({
      userId,
      issueId: plan.issueId,
      steps: plan.steps,
      prTitle: plan.prTitle,
      prDescription: plan.prDescription,
      generatedAt: new Date(plan.generatedAt)
    })
    .onConflictDoUpdate({
      target: [implementationPlans.userId, implementationPlans.issueId],
      set: {
        steps: plan.steps,
        prTitle: plan.prTitle,
        prDescription: plan.prDescription,
        generatedAt: new Date(plan.generatedAt)
      }
    })
    .returning();
  return row ? mapPlan(row) : null;
}

export function mapSkillProfile(row: typeof skillProfiles.$inferSelect): SkillProfile {
  return {
    languages: row.languages as SkillProfile["languages"],
    frameworks: row.frameworks as string[],
    difficulty: row.difficulty as Difficulty,
    preferredDomain: row.preferredDomain,
    totalRepos: row.totalRepos ?? 0,
    totalMergedPRs: row.totalPrs ?? 0,
    analyzedAt: (row.analyzedAt ?? new Date()).toISOString(),
    expiresAt: (row.expiresAt ?? new Date()).toISOString()
  };
}

export function mapRepository(row: typeof discoveredRepos.$inferSelect): Repository {
  return {
    id: row.id,
    githubRepoId: row.githubRepoId,
    fullName: row.fullName,
    description: row.description ?? "",
    language: row.language ?? "Unknown",
    stars: row.stars ?? 0,
    forks: row.forks ?? 0,
    healthScore: row.healthScore ?? 0,
    healthBreakdown: (row.healthBreakdown ?? {}) as HealthBreakdown,
    skillMatchScore: row.skillMatchScore ?? 0,
    finalScore: row.finalScore ?? 0
  };
}

export function mapIssue(row: typeof discoveredIssues.$inferSelect): Issue {
  const context = normalizeIssueContext(row.issueContext, row.title);
  return {
    id: row.id,
    repoId: row.repoId ?? "",
    githubIssueNumber: row.githubIssueNumber,
    githubNodeId: row.githubNodeId ?? "",
    githubUrl: row.githubUrl ?? "",
    title: row.title,
    body: row.body ?? "",
    labels: (row.labels ?? []) as string[],
    difficulty: (row.difficultyEstimate ?? "Beginner") as Difficulty,
    timeEstimateMins: row.timeEstimateMins ?? 60,
    aiSummary: row.aiSummary ?? "",
    likelyFiles: (row.likelyFiles ?? []) as LikelyFile[],
    issueContext: context,
    explainedAt: row.explainedAt?.toISOString() ?? null,
    saved: Boolean(row.saved),
    dismissed: Boolean(row.dismissed),
    state: row.state === "closed" ? "closed" : "open"
  };
}

function normalizeIssueContext(value: unknown, title: string): IssueContext {
  const context = typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Partial<IssueContext>) : {};
  return {
    problem: typeof context.problem === "string" && context.problem ? context.problem : title,
    context: typeof context.context === "string" && context.context ? context.context : "Issue explanation has not been generated yet.",
    gotchas: Array.isArray(context.gotchas) ? context.gotchas.filter((item): item is string => typeof item === "string") : [],
    questionsToAsk: Array.isArray(context.questionsToAsk) ? context.questionsToAsk.filter((item): item is string => typeof item === "string") : [],
    type: context.type === "bug" || context.type === "feature" || context.type === "docs" || context.type === "maintenance" ? context.type : "maintenance",
    originalLanguage: context.originalLanguage,
    stale: context.stale
  };
}

export function mapPlan(row: typeof implementationPlans.$inferSelect): ImplementationPlan {
  return {
    id: row.id,
    issueId: row.issueId ?? "",
    steps: row.steps as ImplementationPlan["steps"],
    prTitle: row.prTitle ?? "",
    prDescription: row.prDescription ?? "",
    generatedAt: (row.generatedAt ?? new Date()).toISOString()
  };
}
