export type NotificationChannel = "inApp" | "email";

export type NotificationPreferences = {
  issueRefresh: boolean;
  planReady: boolean;
  prDraftReady: boolean;
  weeklyDigest: boolean;
  channels: Record<NotificationChannel, boolean>;
};

export const notificationPreferenceStorageKey = "contribpath.notification-preferences";

export const defaultNotificationPreferences: NotificationPreferences = {
  issueRefresh: true,
  planReady: true,
  prDraftReady: true,
  weeklyDigest: false,
  channels: {
    inApp: true,
    email: false
  }
};

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  const input = value && typeof value === "object" ? (value as Partial<NotificationPreferences>) : {};
  const channels =
    input.channels && typeof input.channels === "object"
      ? (input.channels as Partial<Record<NotificationChannel, unknown>>)
      : {};

  return {
    issueRefresh: booleanOrDefault(input.issueRefresh, defaultNotificationPreferences.issueRefresh),
    planReady: booleanOrDefault(input.planReady, defaultNotificationPreferences.planReady),
    prDraftReady: booleanOrDefault(input.prDraftReady, defaultNotificationPreferences.prDraftReady),
    weeklyDigest: booleanOrDefault(input.weeklyDigest, defaultNotificationPreferences.weeklyDigest),
    channels: {
      inApp: booleanOrDefault(channels.inApp, defaultNotificationPreferences.channels.inApp),
      email: booleanOrDefault(channels.email, defaultNotificationPreferences.channels.email)
    }
  };
}
