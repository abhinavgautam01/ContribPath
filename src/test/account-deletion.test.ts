import { describe, expect, it } from "vitest";
import { resolveAccountDeletionTarget } from "@/lib/account-deletion";

describe("account deletion", () => {
  it("requires an authenticated session", () => {
    expect(resolveAccountDeletionTarget(undefined)).toEqual({
      ok: false,
      status: 401,
      title: "Unauthorized",
      detail: "Sign in before deleting account data."
    });
  });

  it("distinguishes demo sessions from persisted user accounts", () => {
    expect(resolveAccountDeletionTarget("user_demo")).toEqual({
      ok: true,
      userId: "user_demo",
      storedUser: false
    });
    expect(resolveAccountDeletionTarget("user_123")).toEqual({
      ok: true,
      userId: "user_123",
      storedUser: true
    });
  });
});
