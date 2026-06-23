import { describe, expect, it } from "vitest";
import { buildAgentQueueJobId } from "@/lib/queue/jobs";

describe("queue jobs", () => {
  it("builds stable duplicate-detection ids for equivalent job inputs", () => {
    expect(buildAgentQueueJobId("issue_discovery", { userId: "user_1", refresh: true })).toBe(
      buildAgentQueueJobId("issue_discovery", { userId: "user_1", refresh: true })
    );
    expect(buildAgentQueueJobId("issue_discovery", { userId: "user_1", preferences: { refresh: true, difficulty: "Beginner" } })).toBe(
      buildAgentQueueJobId("issue_discovery", { preferences: { difficulty: "Beginner", refresh: true }, userId: "user_1" })
    );
  });

  it("separates jobs by input payload", () => {
    expect(buildAgentQueueJobId("issue_discovery", { userId: "user_1", refresh: true })).not.toBe(
      buildAgentQueueJobId("issue_discovery", { userId: "user_1", refresh: false })
    );
  });
});
