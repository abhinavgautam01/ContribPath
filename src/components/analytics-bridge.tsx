"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  analyticsPageViewEvent,
  anonymousAnalyticsProperties,
  normalizePostHogHost,
  shouldLoadAnalytics,
  type AnalyticsConfig
} from "@/lib/analytics";
import { cookieConsentChangedEvent, cookieConsentStorageKey, normalizeCookieConsent } from "@/lib/cookie-consent";

type PostHogClient = {
  init: (key: string, options: Record<string, unknown>) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    posthog?: PostHogClient;
    __contribPathPostHogLoaded?: boolean;
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PostHog script failed to load."));
    document.head.appendChild(script);
  });
}

export function AnalyticsBridge({ postHogKey, postHogHost }: AnalyticsConfig) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    const refreshConsent = () => setConsent(normalizeCookieConsent(window.localStorage.getItem(cookieConsentStorageKey)));
    refreshConsent();
    window.addEventListener("storage", refreshConsent);
    window.addEventListener(cookieConsentChangedEvent, refreshConsent);
    return () => {
      window.removeEventListener("storage", refreshConsent);
      window.removeEventListener(cookieConsentChangedEvent, refreshConsent);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoadAnalytics({ postHogKey, postHogHost }, consent) || initialized.current) return;
    const host = normalizePostHogHost(postHogHost);
    if (!postHogKey || !host) return;

    initialized.current = true;
    loadScript(`${host}/static/array.js`)
      .then(() => {
        window.posthog?.init(postHogKey, {
          api_host: host,
          autocapture: false,
          capture_pageview: false,
          person_profiles: "never"
        });
        window.__contribPathPostHogLoaded = true;
        setReady(true);
      })
      .catch(() => {
        initialized.current = false;
      });
  }, [consent, postHogHost, postHogKey]);

  useEffect(() => {
    if (!ready || !pathname) return;
    window.posthog?.capture(analyticsPageViewEvent, anonymousAnalyticsProperties(pathname));
  }, [pathname, ready]);

  return null;
}
