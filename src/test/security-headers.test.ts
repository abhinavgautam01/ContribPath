import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy, getSecurityHeaders } from "@/lib/security-headers";

describe("security headers", () => {
  it("builds a content security policy with XSS hardening directives", () => {
    const policy = buildContentSecurityPolicy();
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
  });

  it("includes standard browser hardening headers", () => {
    const headers = new Map(getSecurityHeaders().map((header) => [header.key, header.value]));
    expect(headers.get("Content-Security-Policy")).toContain("default-src");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
