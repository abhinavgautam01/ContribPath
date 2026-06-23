import { describe, expect, it } from "vitest";
import { runIssueDiscovery, runIssueExplanation, runPlanner, runProfileAnalysis } from "@/lib/agents";
import { insufficientIssueInformationSummary } from "@/lib/issue-discussion";
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

  it("persists a deterministic explanation for issues without body or comments", async () => {
    const issue = { ...findIssue("issue_filter_persistence")!, id: "empty_issue", body: "" };

    getState().issues.push(issue);
    const job = await runIssueExplanation(issue);

    expect(job.status).toBe("done");
    expect(findIssue("empty_issue")?.issueContext.problem).toBe(insufficientIssueInformationSummary);
  });
});
