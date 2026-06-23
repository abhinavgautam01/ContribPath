import { describe, expect, it } from "vitest";
import { buildAccountExport, buildDemoAccountExport } from "@/lib/db/account-data";
import type { agentJobs, discoveredIssues, discoveredRepos, implementationPlans, oauthAccounts, skillProfiles, users } from "@/lib/db/schema";
import type { AppState } from "@/lib/types";

describe("account data export", () => {
  it("exports stored account data without OAuth token material", () => {
    const oauthAccountWithTokenMaterial = {
      id: "oauth",
      userId: "user",
      provider: "github",
      providerAccountId: "123",
      accessTokenEncrypted: "ciphertext",
      refreshTokenEncrypted: "refresh-ciphertext",
      scope: "read:user",
      tokenType: "bearer",
      expiresAt: null,
      revokedAt: null,
      createdAt: new Date("2026-06-21T10:00:00.000Z"),
      updatedAt: new Date("2026-06-21T11:00:00.000Z")
    } satisfies typeof oauthAccounts.$inferSelect;

    const exported = buildAccountExport({
      exportedAt: new Date("2026-06-21T12:00:00.000Z"),
      user: {
        id: "user",
        githubId: "123",
        githubLogin: "octo",
        email: "octo@example.com",
        avatarUrl: "https://example.com/avatar.png",
        role: "user",
        createdAt: new Date("2026-06-21T10:00:00.000Z"),
        updatedAt: new Date("2026-06-21T11:00:00.000Z"),
        deletedAt: null
      } satisfies typeof users.$inferSelect,
      oauthAccounts: [oauthAccountWithTokenMaterial],
      skillProfiles: [
        {
          id: "profile",
          userId: "user",
          languages: [{ name: "TypeScript", percentage: 90 }],
          frameworks: ["Next.js"],
          difficulty: "Intermediate",
          preferredDomain: "Developer Tools",
          totalRepos: 12,
          totalPrs: 7,
          rawData: { ignored: true },
          analyzedAt: new Date("2026-06-21T10:30:00.000Z"),
          expiresAt: new Date("2026-06-22T10:30:00.000Z")
        } satisfies typeof skillProfiles.$inferSelect
      ],
      discoveredRepos: [
        {
          id: "repo",
          userId: "user",
          githubRepoId: 42,
          fullName: "owner/repo",
          description: "A repo",
          language: "TypeScript",
          stars: 100,
          forks: 5,
          healthScore: 91,
          healthBreakdown: { lastCommit: "< 7d", prMergeRate: "< 7d", issueResponseTime: "< 24h", issuesClosed90d: "20" },
          skillMatchScore: 88,
          finalScore: 90,
          metadataExpiresAt: null,
          healthExpiresAt: null,
          discoveredAt: null
        } satisfies typeof discoveredRepos.$inferSelect
      ],
      discoveredIssues: [
        {
          id: "issue",
          userId: "user",
          repoId: "repo",
          githubIssueNumber: 5,
          githubNodeId: "node",
          title: "Fix bug",
          body: "Body",
          labels: ["bug"],
          difficultyEstimate: "Beginner",
          timeEstimateMins: 45,
          aiSummary: "Summary",
          likelyFiles: [{ path: "src/index.ts", reason: "entrypoint" }],
          issueContext: { problem: "Fix bug", context: "Context", gotchas: [], questionsToAsk: [], type: "bug" },
          githubUrl: "https://github.com/owner/repo/issues/5",
          state: "open",
          explainedAt: new Date("2026-06-21T11:00:00.000Z"),
          discoveredAt: null,
          saved: true,
          dismissed: false
        } satisfies typeof discoveredIssues.$inferSelect
      ],
      implementationPlans: [
        {
          id: "plan",
          userId: "user",
          issueId: "issue",
          steps: [{ step: 1, title: "Patch", description: "Fix it", files: ["src/index.ts"], tips: [] }],
          prTitle: "Fix bug",
          prDescription: "Summary",
          generatedAt: new Date("2026-06-21T11:15:00.000Z")
        } satisfies typeof implementationPlans.$inferSelect
      ],
      agentJobs: [
        {
          id: "job",
          userId: "user",
          jobType: "plan",
          status: "done",
          queueJobId: "queue-job",
          resultId: null,
          inputPayload: { issueId: "issue" },
          error: null,
          startedAt: new Date("2026-06-21T11:10:00.000Z"),
          completedAt: new Date("2026-06-21T11:15:00.000Z"),
          createdAt: new Date("2026-06-21T11:09:00.000Z")
        } satisfies typeof agentJobs.$inferSelect
      ]
    });

    expect(exported.profile?.totalMergedPRs).toBe(7);
    expect(exported.repos[0]?.fullName).toBe("owner/repo");
    expect(exported.issues[0]?.explainedAt).toBe("2026-06-21T11:00:00.000Z");
    expect(exported.plans[0]?.id).toBe("plan");
    expect(exported.plans[0]?.issueId).toBe("issue");
    expect(exported.jobs[0]?.queueJobId).toBe("queue-job");
    expect(JSON.stringify(exported)).not.toContain("ciphertext");
    expect(JSON.stringify(exported)).not.toContain("refresh-ciphertext");
    expect(JSON.stringify(exported)).not.toContain("rawData");
  });

  it("uses the same export envelope for demo/local state", () => {
    const state: AppState = {
      user: {
        id: "user_demo",
        githubLogin: "demo",
        avatarUrl: "https://example.com/avatar.png",
        role: "user"
      },
      profile: {
        languages: [],
        frameworks: [],
        difficulty: "Beginner",
        preferredDomain: null,
        totalRepos: 0,
        totalMergedPRs: 0,
        analyzedAt: "2026-06-21T10:00:00.000Z",
        expiresAt: "2026-06-22T10:00:00.000Z"
      },
      repos: [],
      issues: [],
      plans: {
        issue_1: {
          id: "plan_issue_1",
          issueId: "issue_1",
          steps: [],
          prTitle: "Draft",
          prDescription: "Body",
          generatedAt: "2026-06-21T11:00:00.000Z"
        }
      },
      jobs: {
        job_1: {
          id: "job_1",
          type: "plan",
          status: "done",
          stage: "Complete",
          progress: 100,
          resultId: "issue_1",
          createdAt: "2026-06-21T10:55:00.000Z",
          completedAt: "2026-06-21T11:00:00.000Z"
        }
      }
    };

    const exported = buildDemoAccountExport(state, new Date("2026-06-21T12:00:00.000Z"));

    expect(exported.exportedAt).toBe("2026-06-21T12:00:00.000Z");
    expect(exported.profile).toBe(state.profile);
    expect(exported.skillProfiles).toEqual([state.profile]);
    expect(exported.plans).toEqual([state.plans.issue_1]);
    expect(exported.jobs[0]).toMatchObject({ jobType: "plan", queueJobId: "job_1" });
    expect(exported.oauthAccounts).toEqual([]);
  });
});
