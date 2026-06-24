import { describe, expect, it } from "vitest";
import { rawGithubSnapshotRetentionCutoff, rawGithubSnapshotRetentionMs, rawGithubSnapshotRetentionPatch } from "@/lib/db/retention";

describe("raw GitHub snapshot retention", () => {
  it("uses the SPEC 24 hour retention window", () => {
    expect(rawGithubSnapshotRetentionMs).toBe(24 * 60 * 60 * 1000);
    expect(rawGithubSnapshotRetentionCutoff(new Date("2026-06-22T12:00:00.000Z")).toISOString()).toBe("2026-06-21T12:00:00.000Z");
  });

  it("clears raw snapshot data while preserving processed profile fields", () => {
    expect(rawGithubSnapshotRetentionPatch()).toEqual({ rawData: null });
  });
});
