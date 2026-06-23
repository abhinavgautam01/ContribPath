import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/demo-data";
import { defaultRepoFilters, paginate, repoMatchesFilters } from "@/lib/repo-filters";

describe("repository filters", () => {
  const repos = createInitialState().repos;
  const repo = repos.find((candidate) => candidate.fullName === "orbit-labs/astrokit")!;

  it("matches repositories by default", () => {
    expect(repoMatchesFilters(repo, defaultRepoFilters)).toBe(true);
  });

  it("filters by language and minimum health score", () => {
    expect(repoMatchesFilters(repo, { ...defaultRepoFilters, language: "TypeScript" })).toBe(true);
    expect(repoMatchesFilters(repo, { ...defaultRepoFilters, language: "Rust" })).toBe(false);
    expect(repoMatchesFilters(repo, { ...defaultRepoFilters, minScore: repo.healthScore })).toBe(true);
    expect(repoMatchesFilters(repo, { ...defaultRepoFilters, minScore: repo.healthScore + 1 })).toBe(false);
  });

  it("paginates result sets with metadata", () => {
    const result = paginate(repos, 2, 2);
    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual({
      total: 3,
      page: 2,
      limit: 2,
      totalPages: 2
    });
  });
});
