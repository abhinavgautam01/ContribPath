import { json } from "@/lib/api";
import { clearAuthCookies } from "@/lib/auth/session-cookies";

type HeaderReader = {
  get?: (name: string) => string | null | undefined;
};

type GitHubErrorLike = {
  status?: number;
  response?: {
    headers?: HeaderReader | Record<string, string | number | undefined>;
  };
};

export type GitHubErrorDecision =
  | {
      handled: true;
      status: 401 | 429 | 503;
      title: string;
      detail: string;
      retryAfter?: number;
      retryAfterAt?: string;
    }
  | { handled: false };

function headerValue(headers: HeaderReader | Record<string, string | number | undefined> | undefined, name: string) {
  if (!headers) return undefined;
  if (typeof (headers as HeaderReader).get === "function") return (headers as HeaderReader).get?.(name) ?? undefined;
  const record = headers as Record<string, string | number | undefined>;
  return record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
}

function retryAfterFromGitHubReset(value: unknown, now = Date.now()) {
  const resetSeconds = Number(value);
  if (!Number.isFinite(resetSeconds) || resetSeconds <= 0) return undefined;
  return Math.max(0, Math.ceil(resetSeconds - now / 1000));
}

function retryAfterFromHeader(value: unknown) {
  const retryAfter = Number(value);
  return Number.isFinite(retryAfter) && retryAfter >= 0 ? Math.ceil(retryAfter) : undefined;
}

function retryAfterAt(retryAfter: number, now = Date.now()) {
  return new Date(now + retryAfter * 1000).toISOString();
}

export function classifyGitHubError(error: unknown, now = Date.now()): GitHubErrorDecision {
  if (typeof error !== "object" || error === null) return { handled: false };
  const githubError = error as GitHubErrorLike;
  const status = githubError.status;
  const headers = githubError.response?.headers;

  if (status === 401) {
    return {
      handled: true,
      status: 401,
      title: "GitHub Connection Lost",
      detail: "Your GitHub connection was lost. Please sign in again."
    };
  }

  if (status === 403 && String(headerValue(headers, "x-ratelimit-remaining")) === "0") {
    const retryAfter = retryAfterFromGitHubReset(headerValue(headers, "x-ratelimit-reset"), now) ?? 3600;
    const resetAt = retryAfterAt(retryAfter, now);
    return {
      handled: true,
      status: 429,
      title: "Rate Limit Exceeded",
      detail: `GitHub API quota exhausted. Retry after ${resetAt}.`,
      retryAfter,
      retryAfterAt: resetAt
    };
  }

  if (status === 429) {
    const retryAfter = retryAfterFromHeader(headerValue(headers, "retry-after")) ?? 8;
    const resetAt = retryAfterAt(retryAfter, now);
    return {
      handled: true,
      status: 429,
      title: "Rate Limit Exceeded",
      detail: `GitHub secondary rate limit hit. Retry after ${resetAt}.`,
      retryAfter,
      retryAfterAt: resetAt
    };
  }

  if (status && [500, 502, 503, 504].includes(status)) {
    return {
      handled: true,
      status: 503,
      title: "GitHub API Unavailable",
      detail: "GitHub API is unavailable. Try again later."
    };
  }

  return { handled: false };
}

export function isGitHubPrimaryRateLimitError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const githubError = error as GitHubErrorLike;
  return githubError.status === 403 && String(headerValue(githubError.response?.headers, "x-ratelimit-remaining")) === "0";
}

export function githubErrorResponse(error: unknown, options: { clearAuthCookies?: boolean } = {}) {
  const decision = classifyGitHubError(error);
  if (!decision.handled) return null;
  const response = json(
    {
      type: `https://contribpath.dev/errors/${decision.title.toLowerCase().replaceAll(" ", "-")}`,
      title: decision.title,
      status: decision.status,
      detail: decision.detail,
      ...(decision.retryAfterAt ? { retryAfter: decision.retryAfterAt } : {})
    },
    {
      status: decision.status,
      headers: {
        ...(decision.retryAfter !== undefined ? { "Retry-After": String(decision.retryAfter) } : {}),
        ...(decision.retryAfterAt ? { "X-RateLimit-Reset": decision.retryAfterAt } : {})
      }
    }
  );
  if (decision.status === 401 && options.clearAuthCookies) {
    clearAuthCookies(response);
  }
  return response;
}
