"use client";

import { useEffect, useState } from "react";
import { Bell, EnvelopeSimple } from "@phosphor-icons/react";
import { Badge } from "@/components/badge";
import {
  defaultNotificationPreferences,
  normalizeNotificationPreferences,
  notificationPreferenceStorageKey,
  type NotificationPreferences
} from "@/lib/notification-preferences";

type PreferenceKey = Exclude<keyof NotificationPreferences, "channels">;

const preferenceRows: { key: PreferenceKey; label: string; description: string }[] = [
  {
    key: "issueRefresh",
    label: "Fresh issue matches",
    description: "Newly discovered issues that fit your skill profile."
  },
  {
    key: "planReady",
    label: "Implementation plans",
    description: "Plan generation completion for selected issues."
  },
  {
    key: "prDraftReady",
    label: "PR drafts",
    description: "Regenerated PR titles and descriptions."
  },
  {
    key: "weeklyDigest",
    label: "Weekly digest",
    description: "A compact summary of saved issues and contribution progress."
  }
];

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState(defaultNotificationPreferences);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(notificationPreferenceStorageKey);
    if (!raw) return;
    try {
      setPreferences(normalizeNotificationPreferences(JSON.parse(raw)));
    } catch {
      setPreferences(defaultNotificationPreferences);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(notificationPreferenceStorageKey, JSON.stringify(preferences));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1200);
    return () => window.clearTimeout(timer);
  }, [preferences]);

  function updatePreference(key: PreferenceKey, value: boolean) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function updateChannel(key: keyof NotificationPreferences["channels"], value: boolean) {
    setPreferences((current) => ({
      ...current,
      channels: {
        ...current.channels,
        [key]: value
      }
    }));
  }

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Notification prefs</p>
          <h2 className="mt-2 font-display text-2xl font-bold">Contribution alerts</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Choose which product events should surface in your account.</p>
        </div>
        {saved ? <Badge className="border-emerald-300/25 bg-emerald-300/5 text-emerald-200">Saved</Badge> : null}
      </div>
      <div className="mt-6 grid gap-3">
        {preferenceRows.map((row) => (
          <label key={row.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border-subtle bg-base/50 p-4">
            <span>
              <span className="flex items-center gap-2 font-medium">
                <Bell size={17} className="text-accent-primary" />
                {row.label}
              </span>
              <span className="mt-1 block text-sm text-text-muted">{row.description}</span>
            </span>
            <input
              type="checkbox"
              checked={preferences[row.key]}
              onChange={(event) => updatePreference(row.key, event.target.checked)}
              className="h-5 w-5 shrink-0 accent-accent-primary"
            />
          </label>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-border-subtle bg-base/40 p-4">
        <p className="font-mono text-xs uppercase tracking-wide text-text-muted">Delivery channels</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface/70 p-3">
            <span className="flex items-center gap-2 text-sm">
              <Bell size={17} className="text-accent-secondary" />
              In-app
            </span>
            <input
              type="checkbox"
              checked={preferences.channels.inApp}
              onChange={(event) => updateChannel("inApp", event.target.checked)}
              className="h-5 w-5 accent-accent-primary"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface/70 p-3">
            <span className="flex items-center gap-2 text-sm">
              <EnvelopeSimple size={17} className="text-accent-secondary" />
              Email
            </span>
            <input
              type="checkbox"
              checked={preferences.channels.email}
              onChange={(event) => updateChannel("email", event.target.checked)}
              className="h-5 w-5 accent-accent-primary"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
