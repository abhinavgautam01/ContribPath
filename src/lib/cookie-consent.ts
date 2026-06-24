export type CookieConsentChoice = "accepted" | "declined";

export const cookieConsentStorageKey = "contribpath.cookie-consent";
export const cookieConsentChangedEvent = "contribpath:cookie-consent-changed";

export function normalizeCookieConsent(value: unknown): CookieConsentChoice | null {
  return value === "accepted" || value === "declined" ? value : null;
}

export function hasAnalyticsConsent(value: unknown) {
  return normalizeCookieConsent(value) === "accepted";
}
