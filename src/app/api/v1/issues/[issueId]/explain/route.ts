import { json, problem } from "@/lib/api";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import { runIssueExplanation, runIssueExplanationForUser } from "@/lib/agents";
import { getStoredIssue } from "@/lib/db/app-data";
import { getIssueExplanationCooldown } from "@/lib/issue-workflow";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { findIssue } from "@/lib/store";

function explanationCooldownProblem(cooldown: Extract<ReturnType<typeof getIssueExplanationCooldown>, { coolingDown: true }>) {
  return problem(429, "Issue Already Explained", `Issue explanation was generated recently. Retry after ${cooldown.resetAt}.`, {
    headers: {
      "Retry-After": String(cooldown.retryAfter),
      "X-RateLimit-Reset": cooldown.resetAt
    }
  });
}

type RouteContext = { params: Promise<{ issueId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { issueId } = await params;
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const { session, response } = await enforceRateLimit("issue_explanation", "user_demo", request);
  if (response) return response;
  const realUserId = session?.user.id && session.user.id !== "user_demo" ? session.user.id : null;
  const storedIssue = realUserId ? await getStoredIssue(realUserId, issueId) : null;
  if (storedIssue) {
    const cooldown = getIssueExplanationCooldown(storedIssue);
    if (cooldown.coolingDown) return explanationCooldownProblem(cooldown);
    const job = await runIssueExplanationForUser(realUserId!, storedIssue);
    return json({ jobId: job.id, status: job.status });
  }
  const issue = findIssue(issueId);
  if (!issue) return problem(404, "Not Found", "Issue not in user's discovered list.");
  const cooldown = getIssueExplanationCooldown(issue);
  if (cooldown.coolingDown) return explanationCooldownProblem(cooldown);
  const job = await runIssueExplanation(issue);
  return json({ jobId: job.id, status: job.status });
}
