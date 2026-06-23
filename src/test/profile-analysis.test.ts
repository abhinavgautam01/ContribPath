import { describe, expect, it } from "vitest";
import {
  assertAnalyzableGitHubAccount,
  getProfileReanalysisState,
  PROFILE_REANALYZE_COOLDOWN_MS,
  ProfileAnalysisBlockedError
} from "@/lib/profile-analysis";

describe("profile reanalysis cooldown", () => {
  const now = Date.parse("2026-06-21T12:00:00.000Z");

  it("disables reanalysis inside the one-hour cooldown", () => {
    const state = getProfileReanalysisState("2026-06-21T11:30:00.000Z", now);
    expect(state.canReanalyze).toBe(false);
    expect(state.waitMinutes).toBe(30);
  });

  it("allows reanalysis once the cooldown has elapsed", () => {
    const analyzedAt = new Date(now - PROFILE_REANALYZE_COOLDOWN_MS).toISOString();
    const state = getProfileReanalysisState(analyzedAt, now);
    expect(state.canReanalyze).toBe(true);
    expect(state.waitMinutes).toBe(0);
  });

  it("allows reanalysis if the timestamp cannot be parsed", () => {
    expect(getProfileReanalysisState("invalid", now).canReanalyze).toBe(true);
  });

  it("blocks organization accounts from contributor profile analysis", () => {
    expect(() => assertAnalyzableGitHubAccount({ type: "Organization" })).toThrow(ProfileAnalysisBlockedError);
    expect(() => assertAnalyzableGitHubAccount({ type: "User" })).not.toThrow();
  });
});
