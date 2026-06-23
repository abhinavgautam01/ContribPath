import { auth } from "@/auth";
import { problem } from "@/lib/api";
import { checkRateLimit, getClientIpIdentity, type RateLimitAction } from "@/lib/rate-limit";

function rateLimitProblem(action: RateLimitAction, rateLimit: Awaited<ReturnType<typeof checkRateLimit>>) {
  return problem(
    429,
    "Rate Limit Exceeded",
    `Quota exceeded for ${action.replaceAll("_", " ")}. Retry after ${rateLimit.resetAt}.`,
    {
      headers: {
        "Retry-After": String(rateLimit.retryAfter),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": rateLimit.resetAt
      }
    }
  );
}

export async function enforceRateLimit(action: RateLimitAction, fallbackIdentity = "anonymous", request?: Request) {
  const session = await auth();
  const identity = session?.user.id ?? getClientIpIdentity(request, fallbackIdentity);

  if (!session?.user.id && request) {
    const anonymousRateLimit = await checkRateLimit("anonymous_api", identity);
    if (anonymousRateLimit.limited) {
      return {
        session,
        response: rateLimitProblem("anonymous_api", anonymousRateLimit)
      };
    }
  }

  const rateLimit = await checkRateLimit(action, identity);
  if (!rateLimit.limited) {
    return { session, response: null };
  }

  return {
    session,
    response: rateLimitProblem(action, rateLimit)
  };
}
