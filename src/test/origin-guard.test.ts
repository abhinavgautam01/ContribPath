import { describe, expect, it } from "vitest";
import { enforceSameOrigin, isAllowedOrigin } from "@/lib/origin-guard";

function request(origin?: string, url = "http://localhost:3000/api/v1/issues") {
  return new Request(url, {
    method: "POST",
    headers: origin ? { origin } : undefined
  });
}

describe("origin guard", () => {
  it("allows requests without an Origin header", () => {
    expect(isAllowedOrigin(request())).toBe(true);
    expect(enforceSameOrigin(request())).toBeNull();
  });

  it("allows same-origin requests", () => {
    expect(isAllowedOrigin(request("http://localhost:3000"))).toBe(true);
  });

  it("allows the configured app origin", () => {
    expect(isAllowedOrigin(request("http://localhost:3000", "http://127.0.0.1:3000/api/v1/issues"))).toBe(true);
  });

  it("rejects cross-origin state-changing requests", () => {
    const response = enforceSameOrigin(request("https://attacker.example"));
    expect(response?.status).toBe(403);
  });
});
