import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { cookieConsentStorageKey } from "@/lib/cookie-consent";

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
});
