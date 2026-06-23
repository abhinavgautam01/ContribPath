import { describe, expect, it } from "vitest";
import { checkDependency, summarizeReadiness } from "@/lib/readiness";

describe("readiness checks", () => {
  it("marks unconfigured dependencies as demo-mode", async () => {
    await expect(checkDependency({ configured: false })).resolves.toEqual({ status: "demo-mode" });
  });

  it("marks configured dependencies without probes as ok", async () => {
    await expect(checkDependency({ configured: true })).resolves.toEqual({ status: "ok" });
  });

  it("captures probe failures as failed dependency statuses", async () => {
    const result = await checkDependency({
      configured: true,
      probe: async () => {
        throw new Error("connection refused");
      }
    });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("connection refused");
  });

  it("summarizes readiness from dependency results", () => {
    expect(summarizeReadiness({ database: { status: "ok" }, redis: { status: "demo-mode" } })).toBe("ready");
    expect(summarizeReadiness({ database: { status: "failed" }, redis: { status: "ok" } })).toBe("not_ready");
  });
});
