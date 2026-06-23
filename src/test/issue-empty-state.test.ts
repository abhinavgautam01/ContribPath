import { describe, expect, it } from "vitest";
import { getIssueEmptyState } from "@/lib/issue-empty-state";

describe("issue empty state", () => {
  it("shows refresh discovery action when all issues are dismissed", () => {
    const state = getIssueEmptyState([{ dismissed: true }, { dismissed: true }], [], { difficulty: "all" });

    expect(state).toEqual({
      kind: "dismissed-all",
      title: "All issues dismissed",
      body: "Refresh suggestions to run discovery again with relaxed filters.",
      showRefresh: true
    });
  });

  it("suggests trying Intermediate when the difficulty filter has no matches", () => {
    const state = getIssueEmptyState([{ dismissed: false }], [], { difficulty: "Advanced" });

    expect(state).toEqual({
      kind: "difficulty",
      title: "No issues for this difficulty",
      body: "Try Intermediate or clear filters to broaden your matches.",
      showRefresh: false
    });
  });

  it("uses the generic filtered state for broad searches with no matches", () => {
    const state = getIssueEmptyState([{ dismissed: false }], [], { difficulty: "all" });

    expect(state).toEqual({
      kind: "filtered",
      title: "No issues found",
      body: "Try broadening your language or difficulty filters.",
      showRefresh: false
    });
  });
});
