import type { Issue } from "@/lib/types";

export const savedIssuesPageSize = 20;

export function getSavedIssues(issues: Issue[]) {
  return issues.filter((issue) => issue.saved && !issue.dismissed);
}

export function getSavedIssuesPage(issues: Issue[], page: number, pageSize = savedIssuesPageSize) {
  const saved = getSavedIssues(issues);
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const totalPages = Math.max(1, Math.ceil(saved.length / pageSize));
  const currentPage = Math.min(normalizedPage, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: saved.slice(start, start + pageSize),
    allIds: saved.map((issue) => issue.id),
    pagination: {
      total: saved.length,
      page: currentPage,
      pageSize,
      totalPages
    }
  };
}
