import { describe, expect, it } from "vitest";
import { buildJobEvents, encodeSseEvent, replayJobEvents } from "@/lib/job-events";
import type { AgentJob } from "@/lib/types";

const baseJob: AgentJob = {
  id: "job_1",
  type: "plan",
  status: "running",
  stage: "Planning fix",
  progress: 0.5,
  createdAt: "2026-06-21T10:00:00.000Z"
};

describe("job SSE events", () => {
  it("builds status events for running jobs", () => {
    expect(buildJobEvents(baseJob)).toEqual([
      {
        id: 1,
        event: "status",
        data: { status: "running", stage: "Planning fix", progress: 0.5, resultId: null }
      }
    ]);
  });

  it("builds complete events for completed jobs", () => {
    const events = buildJobEvents({ ...baseJob, status: "done", progress: 1, result: { ok: true }, resultId: "plan_1" });
    expect(events.at(-1)).toEqual({
      id: 2,
      event: "complete",
      data: { status: "done", result: { ok: true }, resultId: "plan_1" }
    });
  });

  it("replays from the last event id inclusively", () => {
    const events = buildJobEvents({ ...baseJob, status: "done", progress: 1 });
    expect(replayJobEvents(events, "2")).toEqual([events[1]]);
    expect(replayJobEvents(events, "bad")).toEqual(events);
  });

  it("encodes events as server-sent event frames", () => {
    expect(encodeSseEvent({ id: 1, event: "status", data: { status: "running" } })).toBe(
      'id: 1\nevent: status\ndata: {"status":"running"}\n\n'
    );
  });
});
