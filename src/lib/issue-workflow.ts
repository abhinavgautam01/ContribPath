import type { Issue } from "@/lib/types";

export function hasIssueExplanation(issue: Pick<Issue, "explainedAt">) {
  return Boolean(issue.explainedAt);
}

export const issueExplanationCooldownMs = 30 * 60 * 1000;

export function getIssueExplanationCooldown(
  issue: Pick<Issue, "explainedAt">,
  now = new Date()
): { coolingDown: false } | { coolingDown: true; retryAfter: number; resetAt: string } {
  if (!issue.explainedAt) return { coolingDown: false };
  const explainedAt = Date.parse(issue.explainedAt);
  if (Number.isNaN(explainedAt)) return { coolingDown: false };

  const resetAtMs = explainedAt + issueExplanationCooldownMs;
  const remainingMs = resetAtMs - now.getTime();
  if (remainingMs <= 0) return { coolingDown: false };

  return {
    coolingDown: true,
    retryAfter: Math.ceil(remainingMs / 1000),
    resetAt: new Date(resetAtMs).toISOString()
  };
}
