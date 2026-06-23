import { describe, expect, it } from "vitest";
import { expiresAtFromAccount, normalizeGitHubProfile } from "@/lib/auth/oauth-persistence";

describe("OAuth persistence helpers", () => {
  it("normalizes GitHub profile fields for the local users table", () => {
    const normalized = normalizeGitHubProfile(
      {
        id: 123,
        login: "octo-dev",
        avatar_url: "https://avatars.githubusercontent.com/u/123",
        email: "octo@example.com"
      },
      {
        id: "fallback",
        name: "Fallback",
        email: "fallback@example.com",
        image: null
      }
    );

    expect(normalized).toEqual({
      githubId: "123",
      githubLogin: "octo-dev",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      email: "octo@example.com"
    });
  });

  it("converts provider expiry seconds into Date values", () => {
    const date = expiresAtFromAccount({
      provider: "github",
      type: "oauth",
      providerAccountId: "123",
      expires_at: 1782048000
    });

    expect(date?.toISOString()).toBe("2026-06-21T13:20:00.000Z");
  });
});
