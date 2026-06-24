import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { AnalyticsBridge } from "@/components/analytics-bridge";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ContribPath",
  description: "From zero to first PR in under an hour.",
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
        {children}
        <AnalyticsBridge postHogKey={process.env.NEXT_PUBLIC_POSTHOG_KEY} postHogHost={process.env.NEXT_PUBLIC_POSTHOG_HOST} />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
