import { jobAccepted, json, problem } from "@/lib/api";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import { runProfileAnalysis, runProfileAnalysisForUser } from "@/lib/agents";
import { hasQueueRedis } from "@/lib/env";
import { githubErrorResponse } from "@/lib/github-errors";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { ProfileAnalysisBlockedError } from "@/lib/profile-analysis";
import { buildAgentQueueJobId, enqueueAgentJob } from "@/lib/queue/jobs";
import { findLatestJob } from "@/lib/store";

function analysisAlreadyRunningResponse(response: Response, userId: string | undefined) {
  const latestJob = findLatestJob("profile_analysis");
  const existingJobId =
    latestJob?.id ?? (userId && userId !== "user_demo" ? buildAgentQueueJobId("profile_analysis", { userId }) : null);
  return json(
    {
      type: "https://contribpath.dev/errors/rate-limit-exceeded",
      title: "Rate Limit Exceeded",
      status: 429,
      detail: "Analysis already running or recently completed.",
      jobId: existingJobId
    },
    {
      status: 429,
      headers: {
        "Retry-After": response.headers.get("Retry-After") ?? "3600",
        "X-RateLimit-Limit": response.headers.get("X-RateLimit-Limit") ?? "1",
        "X-RateLimit-Remaining": response.headers.get("X-RateLimit-Remaining") ?? "0",
        "X-RateLimit-Reset": response.headers.get("X-RateLimit-Reset") ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    }
  );
}

export async function POST(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const { session, response } = await enforceRateLimit("profile_analysis", "user_demo", request);
  const userId = session?.user.id;
  if (response) return analysisAlreadyRunningResponse(response, userId);
  const isRealUser = Boolean(userId && userId !== "user_demo");

  if (hasQueueRedis() && isRealUser) {
    const queued = await enqueueAgentJob("profile_analysis", { userId });
    if (queued) return jobAccepted(String(queued.id));
  }
  if (isRealUser) {
    try {
      const job = await runProfileAnalysisForUser(userId!);
      return jobAccepted(job.id);
    } catch (error) {
      return profileAnalysisErrorResponse(error);
    }
  }
  const job = await runProfileAnalysis();
  return jobAccepted(job.id);
}

function profileAnalysisErrorResponse(error: unknown) {
  if (error instanceof ProfileAnalysisBlockedError) {
    return problem(403, "Profile Analysis Blocked", error.message);
  }
  const githubResponse = githubErrorResponse(error);
  if (githubResponse) return githubResponse;
  throw error;
}
