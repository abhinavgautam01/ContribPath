import { describe, expect, it } from "vitest";
import { cookieConsentStorageKey, hasAnalyticsConsent, normalizeCookieConsent } from "@/lib/cookie-consent";

describe("cookie consent", () => {
  it("uses a stable storage key", () => {
    expect(cookieConsentStorageKey).toBe("contribpath.cookie-consent");
  });

  it("normalizes supported consent choices", () => {
    expect(normalizeCookieConsent("accepted")).toBe("accepted");
    expect(normalizeCookieConsent("declined")).toBe("declined");
    expect(normalizeCookieConsent("unknown")).toBeNull();
    expect(normalizeCookieConsent(undefined)).toBeNull();
  });

  it("only enables analytics after explicit acceptance", () => {
    expect(hasAnalyticsConsent("accepted")).toBe(true);
    expect(hasAnalyticsConsent("declined")).toBe(false);
    expect(hasAnalyticsConsent(null)).toBe(false);
  });
});
