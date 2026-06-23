import type { Repository } from "@/lib/types";
export { paginate } from "@/lib/pagination";

export type RepoFilters = {
  language: string;
  minScore: number;
};

export const defaultRepoFilters: RepoFilters = {
  language: "all",
  minScore: 0
};

export function repoMatchesFilters(repo: Repository, filters: RepoFilters) {
  if (repo.healthScore < filters.minScore) return false;
  if (filters.language !== "all" && repo.language !== filters.language) return false;
  return true;
}
