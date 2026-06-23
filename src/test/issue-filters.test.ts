import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/demo-data";
import { defaultIssueFilters, issueMatchesFilters } from "@/lib/issue-filters";

describe("issue filters", () => {
  const state = createInitialState();
  const issue = state.issues.find((candidate) => candidate.id === "issue_filter_persistence")!;
  const repo = state.repos.find((candidate) => candidate.id === issue.repoId)!;

  it("matches active issues by default", () => {
    expect(issueMatchesFilters(issue, repo, defaultIssueFilters)).toBe(true);
  });

  it("matches search text across issue and repository metadata", () => {
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, q: "dashboard filters" })).toBe(true);
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, q: "frontend" })).toBe(true);
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, q: "not-present" })).toBe(false);
  });

  it("applies difficulty, language, saved, and health filters", () => {
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, difficulty: "Intermediate" })).toBe(true);
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, difficulty: "Advanced" })).toBe(false);
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, language: repo.language })).toBe(true);
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, language: "Rust" })).toBe(false);
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, saved: true })).toBe(true);
    expect(issueMatchesFilters(issue, repo, { ...defaultIssueFilters, minHealth: repo.healthScore + 1 })).toBe(false);
  });

  it("excludes dismissed issues and missing repositories", () => {
    expect(issueMatchesFilters({ ...issue, dismissed: true }, repo, defaultIssueFilters)).toBe(false);
    expect(issueMatchesFilters(issue, undefined, defaultIssueFilters)).toBe(false);
  });
});
