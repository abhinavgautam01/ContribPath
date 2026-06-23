import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

describe("environment readiness", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("reports demo mode when production credentials are absent", async () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("CACHE_REDIS_URL", "");
    vi.stubEnv("QUEUE_REDIS_URL", "");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    const { getRuntimeMode, getMissingProductionEnv } = await import("@/lib/env");
    expect(getRuntimeMode()).toBe("demo");
    expect(getMissingProductionEnv()).toContain("DATABASE_URL");
  });

  it("reports production-ready mode when required credentials are present", async () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "secret");
    vi.stubEnv("AUTH_SECRET", "auth");
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");
    vi.stubEnv("CACHE_REDIS_URL", "redis://localhost:6379/0");
    vi.stubEnv("QUEUE_REDIS_URL", "redis://localhost:6379/1");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "token-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic");
    const { getRuntimeMode, getMissingProductionEnv } = await import("@/lib/env");
    expect(getRuntimeMode()).toBe("production-ready");
    expect(getMissingProductionEnv()).toEqual([]);
  });

  it("uses least-privilege GitHub OAuth scopes by default", async () => {
    vi.stubEnv("GITHUB_OAUTH_READ_ORG", "");
    vi.stubEnv("EMAIL_NOTIFICATIONS_ENABLED", "");
    const { getGitHubOAuthScope } = await import("@/lib/env");

    expect(getGitHubOAuthScope()).toBe("read:user");
    expect(getGitHubOAuthScope()).not.toContain("public_repo");
  });

  it("adds optional GitHub OAuth scopes only when enabled", async () => {
    vi.stubEnv("GITHUB_OAUTH_READ_ORG", "true");
    vi.stubEnv("EMAIL_NOTIFICATIONS_ENABLED", "true");
    const { getGitHubOAuthScope } = await import("@/lib/env");

    expect(getGitHubOAuthScope()).toBe("read:user read:org user:email");
  });

  it("documents optional OAuth scope toggles in the example environment", () => {
    const example = readFileSync(".env.example", "utf8");

    expect(example).toContain("GITHUB_OAUTH_READ_ORG=false");
    expect(example).toContain("EMAIL_NOTIFICATIONS_ENABLED=false");
    expect(example).not.toContain("public_repo");
  });
});
