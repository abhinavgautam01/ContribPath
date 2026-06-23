import { describe, expect, it } from "vitest";
import { isAdminRole, normalizeRole } from "@/lib/auth/roles";

describe("role helpers", () => {
  it("normalizes only the admin role as admin", () => {
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("user")).toBe("user");
    expect(normalizeRole("owner")).toBe("user");
    expect(normalizeRole(undefined)).toBe("user");
  });

  it("checks admin role access", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user")).toBe(false);
  });
});
