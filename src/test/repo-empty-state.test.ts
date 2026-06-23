import { describe, expect, it } from "vitest";
import { getRepoEmptyState } from "@/lib/repo-empty-state";

describe("repo empty state", () => {
  it("suggests running discovery when no repositories have been found", () => {
    expect(getRepoEmptyState([], [], { language: "all", minScore: 0 })).toEqual({
      kind: "none-discovered",
      title: "No repos found",
      body: "Run issue discovery or broaden your language preferences to build a repository shortlist.",
      showRefresh: true
    });
  });

  it("suggests broadening languages when the language filter has no matches", () => {
    expect(getRepoEmptyState([{ id: "repo_1" }], [], { language: "Rust", minScore: 0 })).toEqual({
      kind: "language-filter",
      title: "No repos for this language",
      body: "Try broadening languages or clearing filters to expand the repository shortlist.",
      showRefresh: false
    });
  });

  it("suggests lowering the score threshold when the health filter has no matches", () => {
    expect(getRepoEmptyState([{ id: "repo_1" }], [], { language: "all", minScore: 90 })).toEqual({
      kind: "score-filter",
      title: "No repos above this score",
      body: "Lower the minimum health score to include more maintainer communities.",
      showRefresh: false
    });
  });
});
