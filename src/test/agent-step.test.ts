import { describe, expect, it } from "vitest";
import { AgentStepTimeoutError, runAgentStep } from "@/lib/agent-step";

describe("agent step timeout and retry", () => {
  it("retries failed steps before returning a successful result", async () => {
    let attempts = 0;
    const result = await runAgentStep(
      "Transient step",
      async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("temporary failure");
        return "ok";
      },
      { attempts: 2, timeoutMs: 50 }
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("fails with a timeout error after the retry budget is exhausted", async () => {
    let attempts = 0;
    await expect(
      runAgentStep(
        "Hung step",
        () => {
          attempts += 1;
          return new Promise<string>(() => undefined);
        },
        { attempts: 2, timeoutMs: 1 }
      )
    ).rejects.toBeInstanceOf(AgentStepTimeoutError);
    expect(attempts).toBe(2);
  });
});
