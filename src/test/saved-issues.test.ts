import { describe, expect, it } from "vitest";
import { getSavedIssues, getSavedIssuesPage } from "@/lib/saved-issues";
import type { Issue } from "@/lib/types";

function issue(id: string, saved: boolean, dismissed = false): Issue {
  return {
    id,
    repoId: "repo",
    githubIssueNumber: 1,
    githubNodeId: id,
    githubUrl: "",
    title: id,
    body: "",
    labels: [],
    difficulty: "Beginner",
    timeEstimateMins: 30,
    aiSummary: "",
    likelyFiles: [],
    issueContext: { problem: id, context: "", gotchas: [], questionsToAsk: [], type: "bug" },
    explainedAt: null,
    saved,
    dismissed,
    state: "open"
  };
}

describe("saved issues", () => {
  it("keeps saved, non-dismissed issues only", () => {
    expect(getSavedIssues([issue("saved", true), issue("dismissed", true, true), issue("unsaved", false)]).map((item) => item.id)).toEqual(["saved"]);
  });

  it("paginates saved issues and exposes all ids for bulk dismiss", () => {
    const issues = Array.from({ length: 45 }, (_, index) => issue(`issue_${index + 1}`, true));
    const page = getSavedIssuesPage(issues, 3, 20);

    expect(page.items.map((item) => item.id)).toEqual(["issue_41", "issue_42", "issue_43", "issue_44", "issue_45"]);
    expect(page.allIds).toHaveLength(45);
    expect(page.pagination).toEqual({ total: 45, page: 3, pageSize: 20, totalPages: 3 });
  });
});
