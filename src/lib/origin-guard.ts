import { problem } from "@/lib/api";
import { env } from "@/lib/env";

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const requestOrigin = new URL(request.url).origin;
  const appOrigin = new URL(env.APP_URL).origin;
  return origin === requestOrigin || origin === appOrigin;
}

export function enforceSameOrigin(request: Request) {
  if (isAllowedOrigin(request)) return null;
  return problem(403, "Forbidden", "Cross-origin state-changing requests are not allowed.");
}
