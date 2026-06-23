import type { RepoFilters } from "@/lib/repo-filters";
import type { Repository } from "@/lib/types";

export type RepoEmptyStateKind = "none-discovered" | "language-filter" | "score-filter" | "filtered";

export function getRepoEmptyState(
  allRepos: Pick<Repository, "id">[],
  visibleRepos: Pick<Repository, "id">[],
  filters: RepoFilters
): { kind: RepoEmptyStateKind; title: string; body: string; showRefresh: boolean } {
  if (visibleRepos.length > 0) {
    return {
      kind: "filtered",
      title: "",
      body: "",
      showRefresh: false
    };
  }

  if (allRepos.length === 0) {
    return {
      kind: "none-discovered",
      title: "No repos found",
      body: "Run issue discovery or broaden your language preferences to build a repository shortlist.",
      showRefresh: true
    };
  }

  if (filters.language !== "all") {
    return {
      kind: "language-filter",
      title: "No repos for this language",
      body: "Try broadening languages or clearing filters to expand the repository shortlist.",
      showRefresh: false
    };
  }

  if (filters.minScore > 0) {
    return {
      kind: "score-filter",
      title: "No repos above this score",
      body: "Lower the minimum health score to include more maintainer communities.",
      showRefresh: false
    };
  }

  return {
    kind: "filtered",
    title: "No repos found",
    body: "Try broadening your language filters to build a repository shortlist.",
    showRefresh: false
  };
}
