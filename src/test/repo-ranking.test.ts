import { describe, expect, it } from "vitest";
import { calculateFinalRepoScore, calculateSkillMatchScore, sortRepositoriesByFinalScore } from "@/lib/repo-ranking";
import type { Repository, SkillProfile } from "@/lib/types";

const profile: Pick<SkillProfile, "languages" | "frameworks" | "preferredDomain"> = {
  languages: [{ name: "TypeScript", percentage: 80 }],
  frameworks: ["React", "Next.js"],
  preferredDomain: "Developer Tools"
};

describe("repo ranking", () => {
  it("scores language, framework, and domain fit", () => {
    expect(
      calculateSkillMatchScore({
        repoLanguage: "TypeScript",
        queryLanguage: "TypeScript",
        repoName: "owner/nextjs-devtools",
        description: "React developer tools",
        profile
      })
    ).toBe(100);
  });

  it("combines skill match and health in the final ranking score", () => {
    expect(calculateFinalRepoScore(90, 50)).toBe(74);
    expect(calculateFinalRepoScore(60, 95)).toBe(74);
  });

  it("sorts repositories by final score with health as tie-breaker", () => {
    const repos = [
      { id: "low", finalScore: 50, healthScore: 90 },
      { id: "tie-health", finalScore: 80, healthScore: 95 },
      { id: "tie", finalScore: 80, healthScore: 70 }
    ] as Repository[];

    expect(sortRepositoriesByFinalScore(repos).map((repo) => repo.id)).toEqual(["tie-health", "tie", "low"]);
  });
});
