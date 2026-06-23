import { afterEach, describe, expect, it, vi } from "vitest";
import { createJob, findLatestJob } from "@/lib/store";

describe("store jobs", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("finds the newest job for a type", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T10:00:00.000Z"));
    const older = createJob("profile_analysis", "Older analysis");

    vi.setSystemTime(new Date("2030-01-01T10:05:00.000Z"));
    const newer = createJob("profile_analysis", "Newer analysis");
    createJob("issue_discovery", "Different type");

    expect(findLatestJob("profile_analysis")?.id).toBe(newer.id);
    expect(findLatestJob("profile_analysis")?.id).not.toBe(older.id);
  });
});
