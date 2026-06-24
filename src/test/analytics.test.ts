import { describe, expect, it } from "vitest";
import { anonymousAnalyticsProperties, normalizePostHogHost, shouldLoadAnalytics } from "@/lib/analytics";

describe("analytics consent gating", () => {
  it("normalizes only HTTPS PostHog hosts", () => {
    expect(normalizePostHogHost("https://us.i.posthog.com/path")).toBe("https://us.i.posthog.com");
    expect(normalizePostHogHost("http://localhost:8000")).toBeNull();
    expect(normalizePostHogHost("not-a-url")).toBeNull();
  });

  it("loads analytics only when public config and explicit consent are present", () => {
    const config = {
      postHogKey: "phc_test",
      postHogHost: "https://us.i.posthog.com"
    };

    expect(shouldLoadAnalytics(config, "accepted")).toBe(true);
    expect(shouldLoadAnalytics(config, "declined")).toBe(false);
    expect(shouldLoadAnalytics({ ...config, postHogKey: "" }, "accepted")).toBe(false);
    expect(shouldLoadAnalytics({ ...config, postHogHost: "http://localhost:8000" }, "accepted")).toBe(false);
  });

  it("keeps page view properties anonymous", () => {
    expect(anonymousAnalyticsProperties("/issues/123")).toEqual({ path: "/issues/123" });
  });
});
