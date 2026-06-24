import { afterEach, describe, expect, it, vi } from "vitest";
import { applyIssueExplanation, completeJob, createJob, failJob, findIssue, findLatestInFlightJob, findLatestJob, resetStateForTests } from "@/lib/store";

describe("store jobs", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetStateForTests();
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

  it("finds the newest queued or running job for dashboard resume", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T10:00:00.000Z"));
    const older = createJob("profile_analysis", "Older analysis");
    completeJob(older.id, "Complete", {}, "profile");

    vi.setSystemTime(new Date("2030-01-01T10:05:00.000Z"));
    const active = createJob("issue_discovery", "Discovering issues");

    expect(findLatestInFlightJob()?.id).toBe(active.id);
  });

  it("marks jobs as failed with a terminal error", () => {
    const job = createJob("plan", "Queued");
    const failed = failJob(job.id, "Agent step timed out");

    expect(failed.status).toBe("failed");
    expect(failed.progress).toBe(1);
    expect(failed.error).toBe("Agent step timed out");
    expect(failed.completedAt).toBeDefined();
  });

  it("applies parsed issue explanation fields to demo state", () => {
    const issue = findIssue("issue_notes_table");
    expect(issue).toBeDefined();

    const updated = applyIssueExplanation("issue_notes_table", {
      issueContext: {
        problem: "Updated problem",
        context: "Updated context",
        gotchas: [],
        questionsToAsk: [],
        type: "bug"
      },
      likelyFiles: [{ path: "cmd/info.go", reason: "Validated" }],
      difficulty: "Intermediate",
      timeEstimateMins: 90
    });

    expect(updated?.issueContext.problem).toBe("Updated problem");
    expect(updated?.likelyFiles).toEqual([{ path: "cmd/info.go", reason: "Validated" }]);
    expect(updated?.difficulty).toBe("Intermediate");
    expect(updated?.timeEstimateMins).toBe(90);
  });
});
