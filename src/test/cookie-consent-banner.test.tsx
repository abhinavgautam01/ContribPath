import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { cookieConsentChangedEvent, cookieConsentStorageKey } from "@/lib/cookie-consent";

describe("CookieConsentBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows analytics consent actions when no choice is stored", async () => {
    render(<CookieConsentBanner />);

    expect(await screen.findByText("Analytics cookies")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept analytics/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decline/i })).toBeInTheDocument();
  });

  it("hides when a consent choice already exists", () => {
    window.localStorage.setItem(cookieConsentStorageKey, "declined");
    render(<CookieConsentBanner />);

    expect(screen.queryByText("Analytics cookies")).not.toBeInTheDocument();
  });

  it("emits a same-tab consent event when analytics are accepted", async () => {
    const listener = vi.fn();
    window.addEventListener(cookieConsentChangedEvent, listener);

    render(<CookieConsentBanner />);
    fireEvent.click(await screen.findByRole("button", { name: /accept analytics/i }));

    expect(window.localStorage.getItem(cookieConsentStorageKey)).toBe("accepted");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(cookieConsentChangedEvent, listener);
  });
});
