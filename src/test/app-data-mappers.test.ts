import { describe, expect, it } from "vitest";
import { mapIssue, mapPlan, mapRepository, mapSkillProfile } from "@/lib/db/app-data";
import type { discoveredIssues, discoveredRepos, implementationPlans, skillProfiles } from "@/lib/db/schema";

describe("app data mappers", () => {
  it("maps stored skill profiles into API profiles", () => {
    const profile = mapSkillProfile({
      id: "profile",
      userId: "user",
      languages: [{ name: "Go", percentage: 80 }],
      frameworks: ["React"],
      difficulty: "Intermediate",
      preferredDomain: "Developer Tools",
      totalRepos: 12,
      totalPrs: 5,
      rawData: { contributedRepositories: ["owner/repo"] },
      analyzedAt: new Date("2026-06-21T10:00:00.000Z"),
      expiresAt: new Date("2026-06-22T10:00:00.000Z")
    } satisfies typeof skillProfiles.$inferSelect);

    expect(profile.totalMergedPRs).toBe(5);
    expect(profile.languages[0]?.name).toBe("Go");
    expect(profile.contributedRepositories).toEqual(["owner/repo"]);
  });

  it("maps stored repos and issues into UI-safe records", () => {
    const repo = mapRepository({
      id: "repo",
      userId: "user",
      githubRepoId: 10,
      fullName: "owner/repo",
      description: null,
      language: null,
      stars: null,
      forks: null,
      healthScore: null,
      healthBreakdown: { lastCommit: "Unknown" },
      skillMatchScore: null,
      finalScore: null,
      metadataExpiresAt: null,
      healthExpiresAt: null,
      discoveredAt: null
    } satisfies typeof discoveredRepos.$inferSelect);

    const issue = mapIssue({
      id: "issue",
      userId: "user",
      repoId: "repo",
      githubIssueNumber: 7,
      githubNodeId: null,
      title: "Fix output",
      body: null,
      labels: ["bug"],
      difficultyEstimate: null,
      timeEstimateMins: null,
      aiSummary: null,
      likelyFiles: [{ path: "cmd/info.go", reason: "entrypoint" }],
      issueContext: { problem: "Fix output", context: "", gotchas: [], questionsToAsk: [], type: "bug" },
      githubUrl: null,
      state: null,
      explainedAt: null,
      discoveredAt: null,
      saved: null,
      dismissed: null
    } satisfies typeof discoveredIssues.$inferSelect);

    expect(repo.description).toBe("");
    expect(repo.language).toBe("Unknown");
    expect(issue.difficulty).toBe("Beginner");
    expect(issue.likelyFiles[0]?.path).toBe("cmd/info.go");
    expect(issue.explainedAt).toBeNull();
    expect(issue.issueContext.context).toBe("Issue explanation has not been generated yet.");
  });

  it("maps stored plans into implementation plans", () => {
    const plan = mapPlan({
      id: "plan",
      userId: "user",
      issueId: "issue",
      steps: [{ step: 1, title: "Test", description: "Run tests", files: [], tips: [] }],
      prTitle: null,
      prDescription: null,
      generatedAt: new Date("2026-06-21T10:00:00.000Z")
    } satisfies typeof implementationPlans.$inferSelect);

    expect(plan.issueId).toBe("issue");
    expect(plan.id).toBe("plan");
    expect(plan.steps).toHaveLength(1);
    expect(plan.prTitle).toBe("");
  });
});
