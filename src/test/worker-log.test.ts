import { describe, expect, it, vi } from "vitest";
import { agentNameForJobType, buildWorkerLogEvent } from "@/lib/worker-log";

describe("worker structured logs", () => {
  it("maps job types to SPEC agent names", () => {
    expect(agentNameForJobType("profile_analysis")).toBe("SkillAnalysisAgent");
    expect(agentNameForJobType("issue_discovery")).toBe("RepositoryDiscoveryAgent");
    expect(agentNameForJobType("unknown")).toBe("AgentWorker");
  });

  it("builds completion log fields required by the SPEC", () => {
    expect(
      buildWorkerLogEvent(
        {
          id: "queue_1",
          name: "plan",
          timestamp: Date.parse("2026-06-21T10:00:00.000Z"),
          finishedOn: Date.parse("2026-06-21T10:00:03.250Z"),
          data: { userId: "user_123" }
        },
        "completed"
      )
    ).toEqual({
      userId: "user_123",
      jobId: "queue_1",
      agentName: "ImplementationPlannerAgent",
      durationMs: 3250,
      status: "completed",
      error: null
    });
  });

  it("builds failure logs when BullMQ does not provide a job", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T10:00:00.000Z"));
    expect(buildWorkerLogEvent(undefined, "failed", new Error("Redis lost connection"))).toEqual({
      userId: null,
      jobId: null,
      agentName: "AgentWorker",
      durationMs: 0,
      status: "failed",
      error: "Redis lost connection"
    });
    vi.useRealTimers();
  });
});
