import { describe, expect, it } from "vitest";
import { githubQuotaWarningThreshold, parseGitHubQuotaPayload } from "@/lib/github-quota";

describe("GitHub quota tracking", () => {
  const now = Date.parse("2026-06-21T10:00:00.000Z");

  it("parses the core rate limit snapshot from GitHub payloads", () => {
    expect(
      parseGitHubQuotaPayload(
        {
          resources: {
            core: {
              limit: 5000,
              remaining: 499,
              used: 4501,
              reset: Math.floor(now / 1000) + 3600
            }
          }
        },
        now
      )
    ).toEqual({
      limit: 5000,
      remaining: 499,
      used: 4501,
      resetAt: "2026-06-21T11:00:00.000Z",
      checkedAt: "2026-06-21T10:00:00.000Z",
      warning: true,
      source: "live"
    });
  });

  it("does not warn until the SPEC threshold is crossed", () => {
    const quota = parseGitHubQuotaPayload(
      {
        rate: {
          limit: 5000,
          remaining: githubQuotaWarningThreshold,
          reset: Math.floor(now / 1000) + 3600
        }
      },
      now
    );

    expect(quota?.warning).toBe(false);
    expect(quota?.used).toBe(4500);
  });

  it("rejects malformed quota payloads", () => {
    expect(parseGitHubQuotaPayload({ resources: { core: { remaining: 10 } } }, now)).toBeNull();
    expect(parseGitHubQuotaPayload(null, now)).toBeNull();
  });
});
