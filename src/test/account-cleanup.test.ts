import { describe, expect, it } from "vitest";
import { getUserRedisKeyPatterns } from "@/lib/account-cleanup";

describe("account cleanup", () => {
  it("builds user-scoped Redis key patterns for privacy deletion", () => {
    expect(getUserRedisKeyPatterns("user_123")).toEqual([
      "user:user_123:*",
      "profile:user_123:*",
      "issues:user_123:*",
      "repos:user_123:*",
      "rate:user_123:*"
    ]);
  });
});
