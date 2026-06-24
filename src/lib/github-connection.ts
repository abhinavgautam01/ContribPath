import { markGitHubOAuthTokenRevokedForUser } from "@/lib/auth/oauth-persistence";
import { classifyGitHubError, githubErrorResponse } from "@/lib/github-errors";

export function isGitHubConnectionLost(error: unknown) {
  const decision = classifyGitHubError(error);
  return decision.handled && decision.status === 401;
}

export async function markGitHubTokenRevokedOnConnectionLost(userId: string | null | undefined, error: unknown) {
  if (!userId || !isGitHubConnectionLost(error)) return false;
  return markGitHubOAuthTokenRevokedForUser(userId);
}

export async function githubConnectionErrorResponse(error: unknown, userId: string | null | undefined) {
  const connectionLost = isGitHubConnectionLost(error);
  if (connectionLost) {
    await markGitHubTokenRevokedOnConnectionLost(userId, error);
  }
  return githubErrorResponse(error, { clearAuthCookies: connectionLost });
}
