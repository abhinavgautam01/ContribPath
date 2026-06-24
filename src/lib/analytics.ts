import { hasAnalyticsConsent } from "@/lib/cookie-consent";

export type AnalyticsConfig = {
  postHogKey?: string;
  postHogHost?: string;
};

export const analyticsPageViewEvent = "page_viewed";

export function normalizePostHogHost(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function shouldLoadAnalytics(config: AnalyticsConfig, consent: unknown) {
  return Boolean(config.postHogKey && normalizePostHogHost(config.postHogHost) && hasAnalyticsConsent(consent));
}

export function anonymousAnalyticsProperties(pathname: string) {
  return {
    path: pathname
  };
}
