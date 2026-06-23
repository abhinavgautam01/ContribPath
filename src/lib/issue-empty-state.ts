import type { IssueFilters } from "@/lib/issue-filters";
import type { Issue } from "@/lib/types";

export type IssueEmptyStateKind = "dismissed-all" | "difficulty" | "filtered";

export function getIssueEmptyState(
  allIssues: Pick<Issue, "dismissed">[],
  visibleIssues: Pick<Issue, "id">[],
  filters: Pick<IssueFilters, "difficulty">
): { kind: IssueEmptyStateKind; title: string; body: string; showRefresh: boolean } {
  const activeIssues = allIssues.filter((issue) => !issue.dismissed);
  if (visibleIssues.length > 0) {
    return {
      kind: "filtered",
      title: "",
      body: "",
      showRefresh: false
    };
  }

  if (allIssues.length > 0 && activeIssues.length === 0) {
    return {
      kind: "dismissed-all",
      title: "All issues dismissed",
      body: "Refresh suggestions to run discovery again with relaxed filters.",
      showRefresh: true
    };
  }

  if (filters.difficulty !== "all") {
    return {
      kind: "difficulty",
      title: "No issues for this difficulty",
      body: "Try Intermediate or clear filters to broaden your matches.",
      showRefresh: false
    };
  }

  return {
    kind: "filtered",
    title: "No issues found",
    body: "Try broadening your language or difficulty filters.",
    showRefresh: false
  };
}
