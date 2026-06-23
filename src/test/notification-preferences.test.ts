import { describe, expect, it } from "vitest";
import { defaultNotificationPreferences, normalizeNotificationPreferences, notificationPreferenceStorageKey } from "@/lib/notification-preferences";

describe("notification preferences", () => {
  it("defines a stable local storage key", () => {
    expect(notificationPreferenceStorageKey).toBe("contribpath.notification-preferences");
  });

  it("uses safe defaults for notification preferences", () => {
    expect(defaultNotificationPreferences).toEqual({
      issueRefresh: true,
      planReady: true,
      prDraftReady: true,
      weeklyDigest: false,
      channels: {
        inApp: true,
        email: false
      }
    });
  });

  it("normalizes partial or invalid preference payloads", () => {
    expect(
      normalizeNotificationPreferences({
        issueRefresh: false,
        weeklyDigest: true,
        channels: {
          email: true,
          inApp: "yes"
        }
      })
    ).toEqual({
      issueRefresh: false,
      planReady: true,
      prDraftReady: true,
      weeklyDigest: true,
      channels: {
        inApp: true,
        email: true
      }
    });
  });
});
