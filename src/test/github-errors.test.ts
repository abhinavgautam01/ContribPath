import { describe, expect, it } from "vitest";
import { classifyGitHubError, githubErrorResponse } from "@/lib/github-errors";

describe("GitHub API error handling", () => {
  const now = Date.parse("2026-06-21T10:00:00.000Z");

  it("maps primary GitHub quota exhaustion to retryable rate limit details", () => {
    const decision = classifyGitHubError(
      {
        status: 403,
        response: {
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": String(Math.floor(now / 1000) + 120)
          }
        }
      },
      now
    );

    expect(decision).toEqual({
      handled: true,
      status: 429,
      title: "Rate Limit Exceeded",
      detail: "GitHub API quota exhausted. Retry after 2026-06-21T10:02:00.000Z.",
      retryAfter: 120,
      retryAfterAt: "2026-06-21T10:02:00.000Z"
    });
  });

  it("maps secondary GitHub rate limits with retry-after headers", () => {
    expect(
      classifyGitHubError(
        {
          status: 429,
          response: { headers: { "retry-after": "8" } }
        },
        now
      )
    ).toMatchObject({
      handled: true,
      status: 429,
      retryAfter: 8,
      retryAfterAt: "2026-06-21T10:00:08.000Z"
    });
  });

  it("maps revoked tokens and GitHub outages to actionable statuses", () => {
    expect(classifyGitHubError({ status: 401 }, now)).toMatchObject({
      handled: true,
      status: 401,
      title: "GitHub Connection Lost"
    });
    expect(classifyGitHubError({ status: 503 }, now)).toMatchObject({
      handled: true,
      status: 503,
      title: "GitHub API Unavailable"
    });
  });

  it("returns RFC7807-style responses with retry headers", async () => {
    const response = githubErrorResponse({
      status: 429,
      response: { headers: { "retry-after": "8" } }
    });

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("8");
    await expect(response?.json()).resolves.toMatchObject({
      type: "https://contribpath.dev/errors/rate-limit-exceeded",
      title: "Rate Limit Exceeded",
      status: 429,
      retryAfter: expect.any(String)
    });
  });

  it("ignores unrelated errors", () => {
    expect(classifyGitHubError({ status: 404 })).toEqual({ handled: false });
    expect(githubErrorResponse(new Error("local failure"))).toBeNull();
  });
});
