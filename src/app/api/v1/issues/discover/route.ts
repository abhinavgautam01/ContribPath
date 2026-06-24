import { jobAccepted, parseOptionalJsonResult, problem } from "@/lib/api";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import { runIssueDiscovery, runIssueDiscoveryForUser } from "@/lib/agents";
import { getStoredSkillProfile } from "@/lib/db/app-data";
import { isProfileExpired, normalizeDiscoveryLanguages } from "@/lib/discovery-preferences";
import { hasQueueRedis } from "@/lib/env";
import { githubErrorResponse } from "@/lib/github-errors";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { enqueueAgentJob } from "@/lib/queue/jobs";
import { z } from "zod";

const discoveryRequestSchema = z.object({
  languages: z.array(z.string()).optional(),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  refresh: z.boolean().optional()
});

export async function POST(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const parsed = await parseOptionalJsonResult(request, discoveryRequestSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const preferences = {
    ...body,
    languages: normalizeDiscoveryLanguages(body.languages)
  };
  const { session, response } = await enforceRateLimit("issue_discovery", "user_demo", request);
  if (response) return response;
  const userId = session?.user.id;
  const isRealUser = Boolean(userId && userId !== "user_demo");

  if (isRealUser) {
    const profile = await getStoredSkillProfile(userId!);
    if (!profile) return problem(404, "Not Found", "No skill profile exists yet. Run profile analysis first.");
    if (isProfileExpired(profile)) return problem(409, "Profile Expired", "Profile is expired; run /api/v1/profile/analyze before discovery.");
  }

  if (hasQueueRedis() && isRealUser) {
    const queued = await enqueueAgentJob("issue_discovery", { userId, preferences });
    if (queued) return jobAccepted(String(queued.id));
  }
  if (isRealUser) {
    try {
      const job = await runIssueDiscoveryForUser(userId!, preferences);
      return jobAccepted(job.id);
    } catch (error) {
      const githubResponse = githubErrorResponse(error);
      if (githubResponse) return githubResponse;
      throw error;
    }
  }
  const job = await runIssueDiscovery(preferences);
  return jobAccepted(job.id);
}
