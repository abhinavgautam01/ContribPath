import { describe, expect, it } from "vitest";
import { firstPublicRepoMessage, hasNoPublicRepoSignal } from "@/lib/profile-onboarding";

describe("profile onboarding", () => {
  it("detects the zero-public-repo profile edge case", () => {
    expect(hasNoPublicRepoSignal({ totalRepos: 0, languages: [] })).toBe(true);
    expect(hasNoPublicRepoSignal({ totalRepos: 1, languages: [] })).toBe(false);
    expect(hasNoPublicRepoSignal({ totalRepos: 0, languages: [{ name: "TypeScript", percentage: 100 }] })).toBe(false);
  });

  it("uses the SPEC onboarding message", () => {
    expect(firstPublicRepoMessage).toBe("Make your first public repo to get started.");
  });
});
