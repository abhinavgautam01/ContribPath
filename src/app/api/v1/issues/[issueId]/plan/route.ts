import { auth } from "@/auth";
import { jobAccepted, json, problem } from "@/lib/api";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import { runPlanner, runPlannerForUser } from "@/lib/agents";
import { getStoredIssue, getStoredPlan } from "@/lib/db/app-data";
import { hasQueueRedis } from "@/lib/env";
import { githubErrorResponse } from "@/lib/github-errors";
import { hasIssueExplanation } from "@/lib/issue-workflow";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { enqueueAgentJob } from "@/lib/queue/jobs";
import { findIssue, getState } from "@/lib/store";

function planConflict(planId: string) {
  return json(
    {
      type: "https://contribpath.dev/errors/plan-already-exists",
      title: "Plan Already Exists",
      status: 409,
      detail: "Plan already exists for this issue.",
      planId
    },
    { status: 409 }
  );
}

type RouteContext = { params: Promise<{ issueId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { issueId } = await params;
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const { session, response } = await enforceRateLimit("plan_generation", "user_demo", request);
  if (response) return response;
  const issue = findIssue(issueId);
  const realUserId = session?.user.id && session.user.id !== "user_demo" ? session.user.id : null;
  const storedIssue = realUserId ? await getStoredIssue(realUserId, issueId) : null;
  if (storedIssue) {
    const existingPlan = await getStoredPlan(realUserId!, storedIssue.id);
    if (existingPlan) return planConflict(existingPlan.id);
    if (!hasIssueExplanation(storedIssue)) return problem(409, "Issue Explanation Required", "Issue explanation is not complete yet.");
    if (hasQueueRedis()) {
      const queued = await enqueueAgentJob("plan", { userId: realUserId, issueId: storedIssue.id });
      if (queued) return jobAccepted(String(queued.id));
    }
    try {
      const job = await runPlannerForUser(realUserId!, storedIssue);
      return jobAccepted(job.id);
    } catch (error) {
      const githubResponse = githubErrorResponse(error);
      if (githubResponse) return githubResponse;
      throw error;
    }
  }
  if (!issue) return problem(404, "Not Found", "Issue not found for this user.");
  const existingPlan = getState().plans[issue.id];
  if (existingPlan) return planConflict(existingPlan.id);
  if (!hasIssueExplanation(issue)) return problem(409, "Issue Explanation Required", "Issue explanation is not complete yet.");
  if (hasQueueRedis()) {
    const queued = await enqueueAgentJob("plan", { userId: "current", issueId: issue.id });
    if (queued) return jobAccepted(String(queued.id));
  }
  const job = await runPlanner(issue);
  return jobAccepted(job.id);
}

export async function GET(_: Request, { params }: RouteContext) {
  const { issueId } = await params;
  const session = await auth();
  if (session?.user.id && session.user.id !== "user_demo") {
    const plan = await getStoredPlan(session.user.id, issueId);
    if (plan) return json(plan);
  }
  const plan = getState().plans[issueId];
  if (!plan) return problem(404, "Not Found", "Plan has not been generated for this issue.");
  return json(plan);
}
