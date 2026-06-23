import { describe, expect, it } from "vitest";
import { applyProfilePreferencePatch, normalizeFrameworks, normalizePreferredDomain } from "@/lib/profile-preferences";
import type { SkillProfile } from "@/lib/types";

const profile: SkillProfile = {
  languages: [{ name: "TypeScript", percentage: 78 }],
  frameworks: ["React"],
  difficulty: "Intermediate",
  preferredDomain: "Developer Tools",
  totalRepos: 12,
  totalMergedPRs: 6,
  analyzedAt: "2026-06-01T00:00:00.000Z",
  expiresAt: "2026-06-02T00:00:00.000Z"
};

describe("profile preferences", () => {
  it("normalizes preferred domains", () => {
    expect(normalizePreferredDomain("  Platform Engineering  ")).toBe("Platform Engineering");
    expect(normalizePreferredDomain("   ")).toBeNull();
    expect(normalizePreferredDomain(undefined)).toBeNull();
  });

  it("normalizes framework lists from arrays or comma-separated input", () => {
    expect(normalizeFrameworks([" React ", "react", "Next.js", "", "Node.js  "])).toEqual(["React", "Next.js", "Node.js"]);
    expect(normalizeFrameworks("React, Next.js, React, Testing Library")).toEqual(["React", "Next.js", "Testing Library"]);
  });

  it("applies partial updates without erasing omitted fields", () => {
    expect(applyProfilePreferencePatch(profile, { difficulty: "Advanced" })).toEqual({
      ...profile,
      difficulty: "Advanced"
    });
    expect(applyProfilePreferencePatch(profile, { preferredDomain: "", frameworks: "Vue, Nuxt" })).toEqual({
      ...profile,
      preferredDomain: null,
      frameworks: ["Vue", "Nuxt"]
    });
  });
});
