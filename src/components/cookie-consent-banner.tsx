"use client";

import React from "react";
import { useEffect, useState } from "react";
import { ShieldCheck, X } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/magnetic-button";
import { cookieConsentStorageKey, normalizeCookieConsent, type CookieConsentChoice } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [choice, setChoice] = useState<CookieConsentChoice | null>("declined");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChoice(normalizeCookieConsent(window.localStorage.getItem(cookieConsentStorageKey)));
    setHydrated(true);
  }, []);

  function choose(nextChoice: CookieConsentChoice) {
    window.localStorage.setItem(cookieConsentStorageKey, nextChoice);
    setChoice(nextChoice);
  }

  if (!hydrated || choice) return null;

  return (
    <aside
      className="fixed bottom-4 left-1/2 z-50 w-[min(720px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-border-subtle bg-surface/95 p-4 shadow-glow backdrop-blur-md"
      aria-label="Cookie consent"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent-secondary/25 bg-[var(--accent-secondary-bg)] text-accent-secondary">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="font-display text-lg font-bold tracking-tight">Analytics cookies</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Essential session cookies stay on. Anonymous product analytics only run if you opt in.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <MagneticButton type="button" variant="ghost" onClick={() => choose("declined")}>
            <X size={17} />
            Decline
          </MagneticButton>
          <MagneticButton type="button" variant="primary" onClick={() => choose("accepted")}>
            Accept analytics
          </MagneticButton>
        </div>
      </div>
    </aside>
  );
}
