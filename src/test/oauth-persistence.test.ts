import { describe, expect, it } from "vitest";
import {
  expiredProfilePatchForUsernameChange,
  expiresAtFromAccount,
  hasGitHubUsernameChanged,
  normalizeGitHubProfile,
  revokedTokenPatch
} from "@/lib/auth/oauth-persistence";

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

  it("detects GitHub username changes for profile invalidation", () => {
    expect(hasGitHubUsernameChanged("octo-dev", "octo-renamed")).toBe(true);
    expect(hasGitHubUsernameChanged("octo-dev", "octo-dev")).toBe(false);
    expect(hasGitHubUsernameChanged(null, "octo-dev")).toBe(false);
    expect(hasGitHubUsernameChanged(undefined, "octo-dev")).toBe(false);
  });

  it("expires stored skill profiles when a username change requires re-analysis", () => {
    expect(expiredProfilePatchForUsernameChange().expiresAt.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("marks revoked OAuth tokens with a durable timestamp patch", () => {
    const now = new Date("2026-06-21T12:00:00.000Z");
    expect(revokedTokenPatch(now)).toEqual({
      revokedAt: now,
      updatedAt: now
    });
  });
});
