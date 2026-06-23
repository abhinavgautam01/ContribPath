import { describe, expect, it } from "vitest";
import { applyFixedWindowLimit, buildRateLimitKey, getClientIpIdentity, getRateLimitRule } from "@/lib/rate-limit";

describe("rate limiting", () => {
  it("uses user-scoped action keys", () => {
    expect(buildRateLimitKey("plan_generation", "user_123")).toBe("rate:user_123:plan_generation");
  });

  it("matches SPEC quota limits for expensive actions", () => {
    expect(getRateLimitRule("anonymous_api").limit).toBe(10);
    expect(getRateLimitRule("anonymous_api").windowMs).toBe(60_000);
    expect(getRateLimitRule("profile_analysis").limit).toBe(1);
    expect(getRateLimitRule("issue_discovery").limit).toBe(3);
    expect(getRateLimitRule("issue_explanation").limit).toBe(10);
    expect(getRateLimitRule("plan_generation").limit).toBe(10);
    expect(getRateLimitRule("pr_draft").limit).toBe(20);
  });

  it("builds per-IP identities for unauthenticated requests", () => {
    expect(
      getClientIpIdentity(
        new Request("http://localhost/api", {
          headers: { "x-forwarded-for": "203.0.113.4, 198.51.100.9" }
        }),
        "fallback"
      )
    ).toBe("ip:203.0.113.4");
    expect(getClientIpIdentity(new Request("http://localhost/api"), "fallback")).toBe("ip:fallback");
  });

  it("allows requests within the fixed window and blocks after the limit", () => {
    const now = Date.parse("2026-06-21T12:00:00.000Z");
    const rule = { limit: 2, windowMs: 60_000 };
    const first = applyFixedWindowLimit(undefined, rule, now);
    const second = applyFixedWindowLimit(first.bucket, rule, now + 10_000);
    const third = applyFixedWindowLimit(second.bucket, rule, now + 20_000);

    expect(first.result.limited).toBe(false);
    expect(second.result.limited).toBe(false);
    expect(third.result.limited).toBe(true);
    expect(third.result.retryAfter).toBe(40);
  });

  it("resets the bucket after the window expires", () => {
    const now = Date.parse("2026-06-21T12:00:00.000Z");
    const rule = { limit: 1, windowMs: 60_000 };
    const first = applyFixedWindowLimit(undefined, rule, now);
    const second = applyFixedWindowLimit(first.bucket, rule, now + 60_000);

    expect(second.result.limited).toBe(false);
    expect(second.bucket.count).toBe(1);
  });
});
