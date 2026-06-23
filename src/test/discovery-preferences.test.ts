import { describe, expect, it } from "vitest";
import { applyDiscoveryPreferences, isProfileExpired, normalizeDiscoveryLanguages } from "@/lib/discovery-preferences";
import type { SkillProfile } from "@/lib/types";

const profile: SkillProfile = {
  languages: [
    { name: "TypeScript", percentage: 70 },
    { name: "Go", percentage: 30 }
  ],
  frameworks: ["React"],
  difficulty: "Intermediate",
  preferredDomain: "Developer Tools",
  totalRepos: 10,
  totalMergedPRs: 5,
  analyzedAt: "2026-06-21T10:00:00.000Z",
  expiresAt: "2026-06-22T10:00:00.000Z"
};

describe("discovery preferences", () => {
  it("normalizes requested discovery languages", () => {
    expect(normalizeDiscoveryLanguages([" TypeScript ", "typescript", "", "Go", 12])).toEqual(["TypeScript", "Go"]);
  });

  it("applies language and difficulty preferences without mutating the profile", () => {
    expect(applyDiscoveryPreferences(profile, { languages: ["Go", "Rust"], difficulty: "Advanced" })).toEqual({
      ...profile,
      languages: [
        { name: "Go", percentage: 30 },
        { name: "Rust", percentage: 0 }
      ],
      difficulty: "Advanced"
    });
    expect(profile.difficulty).toBe("Intermediate");
  });

  it("detects expired profiles from absolute timestamps", () => {
    expect(isProfileExpired(profile, new Date("2026-06-22T10:00:01.000Z").getTime())).toBe(true);
    expect(isProfileExpired(profile, new Date("2026-06-22T09:59:59.000Z").getTime())).toBe(false);
  });
});
