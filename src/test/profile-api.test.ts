import { describe, expect, it } from "vitest";
import { isFreshSkillProfile, resolveProfileGetResult } from "@/lib/profile-api";
import type { SkillProfile } from "@/lib/types";

const demoProfile: SkillProfile = {
  languages: [{ name: "TypeScript", percentage: 100 }],
  frameworks: ["Next.js"],
  difficulty: "Beginner",
  preferredDomain: "Developer Tools",
  totalRepos: 1,
  totalMergedPRs: 0,
  analyzedAt: "2026-06-21T10:00:00.000Z",
  expiresAt: "2026-06-22T10:00:00.000Z"
};

const storedProfile: SkillProfile = {
  ...demoProfile,
  difficulty: "Intermediate",
  totalRepos: 12
};

describe("profile API decisions", () => {
  it("returns demo profile for anonymous and demo sessions", () => {
    expect(resolveProfileGetResult(undefined, null, demoProfile)).toEqual({ ok: true, profile: demoProfile });
    expect(resolveProfileGetResult("user_demo", null, demoProfile)).toEqual({ ok: true, profile: demoProfile });
  });

  it("returns the stored profile for real users after analysis", () => {
    expect(resolveProfileGetResult("user_123", storedProfile, demoProfile)).toEqual({ ok: true, profile: storedProfile });
  });

  it("returns the SPEC 404 decision for real users before analysis", () => {
    expect(resolveProfileGetResult("user_123", null, demoProfile)).toEqual({
      ok: false,
      status: 404,
      title: "Not Found",
      detail: "No analysis run yet. Run profile analysis first."
    });
  });

  it("detects cached profiles that are fresh enough for GitHub quota fallback", () => {
    const now = Date.parse("2026-06-22T09:59:00.000Z");
    expect(isFreshSkillProfile(demoProfile, now)).toBe(true);
    expect(isFreshSkillProfile(demoProfile, Date.parse("2026-06-22T10:00:00.000Z"))).toBe(false);
    expect(isFreshSkillProfile({ ...demoProfile, analyzedAt: "invalid" }, now)).toBe(false);
    expect(isFreshSkillProfile({ ...demoProfile, analyzedAt: "2026-06-22T10:01:00.000Z" }, now)).toBe(false);
  });
});
