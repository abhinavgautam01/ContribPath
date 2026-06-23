import { describe, expect, it } from "vitest";
import { runIssueDiscovery, runPlanner, runProfileAnalysis } from "@/lib/agents";
import { findIssue, getState } from "@/lib/store";

describe("demo agent pipeline", () => {
  it("returns a completed profile analysis job", async () => {
    const job = await runProfileAnalysis();
    expect(job.status).toBe("done");
    expect(job.progress).toBe(1);
    expect(getState().profile.languages.length).toBeGreaterThan(0);
  });

  it("returns discovered issues and repositories", async () => {
    const job = await runIssueDiscovery();
    expect(job.status).toBe("done");
    expect(getState().issues.length).toBeGreaterThan(0);
    expect(getState().repos.length).toBeGreaterThan(0);
  });

  it("generates an implementation plan for an issue", async () => {
    const issue = findIssue("issue_filter_persistence");
    expect(issue).toBeDefined();
    const job = await runPlanner(issue!);
    expect(job.status).toBe("done");
    expect(getState().plans.issue_filter_persistence.steps.length).toBeGreaterThanOrEqual(3);
  });
});
