import { describe, expect, it } from "vitest";
import { uuidResultId } from "@/lib/db/job-data";

describe("job data helpers", () => {
  it("persists only UUID-shaped result identifiers", () => {
    expect(uuidResultId("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
    expect(uuidResultId("profile")).toBeNull();
    expect(uuidResultId(undefined)).toBeNull();
  });
});
