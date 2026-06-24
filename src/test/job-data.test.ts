import { describe, expect, it } from "vitest";
import {
  accountDeletionJobCancellationError,
  accountDeletionJobCancellationPatch,
  inFlightJobStatuses,
  isResumableJobStatus,
  uuidResultId
} from "@/lib/db/job-data";

describe("job data helpers", () => {
  it("persists only UUID-shaped result identifiers", () => {
    expect(uuidResultId("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
    expect(uuidResultId("profile")).toBeNull();
    expect(uuidResultId(undefined)).toBeNull();
  });

  it("builds the account-deletion cancellation patch for in-flight jobs", () => {
    const completedAt = new Date("2026-06-21T12:00:00.000Z");

    expect(inFlightJobStatuses).toEqual(["queued", "running"]);
    expect(accountDeletionJobCancellationPatch(completedAt)).toEqual({
      status: "cancelled",
      error: accountDeletionJobCancellationError,
      completedAt
    });
  });

  it("recognizes queue states that should resume on dashboard return", () => {
    expect(isResumableJobStatus("queued")).toBe(true);
    expect(isResumableJobStatus("running")).toBe(true);
    expect(isResumableJobStatus("done")).toBe(false);
    expect(isResumableJobStatus("failed")).toBe(false);
    expect(isResumableJobStatus(null)).toBe(false);
  });
});
