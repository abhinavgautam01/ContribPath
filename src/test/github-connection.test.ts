import { describe, expect, it } from "vitest";
import { isGitHubConnectionLost } from "@/lib/github-connection";

describe("GitHub connection handling", () => {
  it("recognizes revoked GitHub tokens without treating other GitHub failures as lost connections", () => {
    expect(isGitHubConnectionLost({ status: 401 })).toBe(true);
    expect(isGitHubConnectionLost({ status: 429 })).toBe(false);
    expect(isGitHubConnectionLost({ status: 503 })).toBe(false);
    expect(isGitHubConnectionLost(new Error("local failure"))).toBe(false);
  });
});
