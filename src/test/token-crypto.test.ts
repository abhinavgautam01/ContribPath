import { afterEach, describe, expect, it, vi } from "vitest";

describe("OAuth token encryption", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("round-trips encrypted tokens without storing plaintext", async () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "test-token-encryption-key");
    const { encryptToken, decryptToken } = await import("@/lib/security/token-crypto");
    const encrypted = encryptToken("gho_secret");
    expect(encrypted).not.toContain("gho_secret");
    expect(decryptToken(encrypted)).toBe("gho_secret");
  });
});
