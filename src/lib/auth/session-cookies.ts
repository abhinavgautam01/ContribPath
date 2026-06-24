import type { NextResponse } from "next/server";

export const authCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url"
] as const;

export function clearAuthCookies(response: NextResponse) {
  for (const name of authCookieNames) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/"
    });
  }
}
