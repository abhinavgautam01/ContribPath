import { describe, expect, it } from "vitest";
import { getIssueExplanationCooldown, hasIssueExplanation } from "@/lib/issue-workflow";

describe("issue workflow", () => {
  it("requires an explicit explanation completion timestamp", () => {
    expect(hasIssueExplanation({ explainedAt: null })).toBe(false);
    expect(hasIssueExplanation({ explainedAt: "2026-06-21T10:00:00.000Z" })).toBe(true);
  });

  it("blocks repeat issue explanations for 30 minutes", () => {
    const cooldown = getIssueExplanationCooldown(
      { explainedAt: "2026-06-21T10:00:00.000Z" },
      new Date("2026-06-21T10:10:00.000Z")
    );

    expect(cooldown).toEqual({
      coolingDown: true,
      retryAfter: 1200,
      resetAt: "2026-06-21T10:30:00.000Z"
    });
  });

  it("allows explanation after the cooldown has expired", () => {
    expect(
      getIssueExplanationCooldown({ explainedAt: "2026-06-21T10:00:00.000Z" }, new Date("2026-06-21T10:30:00.000Z"))
    ).toEqual({ coolingDown: false });
    expect(getIssueExplanationCooldown({ explainedAt: null }, new Date("2026-06-21T10:10:00.000Z"))).toEqual({
      coolingDown: false
    });
    expect(getIssueExplanationCooldown({ explainedAt: "not-a-date" }, new Date("2026-06-21T10:10:00.000Z"))).toEqual({
      coolingDown: false
    });
  });
});
