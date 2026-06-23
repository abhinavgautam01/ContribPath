import type { Issue, Repository } from "@/lib/types";

export type IssueFilters = {
  q: string;
  difficulty: string;
  language: string;
  saved: boolean;
  minHealth: number;
};

export const defaultIssueFilters: IssueFilters = {
  q: "",
  difficulty: "all",
  language: "all",
  saved: false,
  minHealth: 0
};

export function issueMatchesFilters(issue: Issue, repo: Repository | undefined, filters: IssueFilters) {
  if (!repo) return false;
  if (issue.dismissed) return false;
  if (filters.difficulty !== "all" && issue.difficulty !== filters.difficulty) return false;
  if (filters.language !== "all" && repo.language !== filters.language) return false;
  if (filters.saved && !issue.saved) return false;
  if (repo.healthScore < filters.minHealth) return false;
  if (filters.q) {
    const haystack = [issue.title, issue.aiSummary, issue.labels.join(" "), repo.fullName, repo.description].join(" ").toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}
