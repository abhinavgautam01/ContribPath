import { json, problem } from "@/lib/api";
import { enforceRateLimit } from "@/lib/api-rate-limit";
import { regeneratePrDraft } from "@/lib/agents";
import { getStoredIssue, getStoredPlan, saveImplementationPlan } from "@/lib/db/app-data";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { findIssue, getState } from "@/lib/store";
import { z } from "zod";

const prDraftOptionsSchema = z
  .object({
    tone: z.enum(["concise", "detailed"]).optional(),
    includeTests: z.boolean().optional()
  })
  .strict();

async function parsePrDraftOptions(request: Request) {
  const text = await request.text();
  if (!text.trim()) return { ok: true as const, data: {} };
  const jsonBody = JSON.parse(text);
  const parsed = prDraftOptionsSchema.safeParse(jsonBody);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  return {
    ok: false as const,
    response: problem(400, "Invalid Request", parsed.error.issues.map((issue) => issue.message).join("; "))
  };
}

type RouteContext = { params: Promise<{ issueId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { issueId } = await params;
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const parsed = await parsePrDraftOptions(request).catch(() => ({
    ok: false as const,
    response: problem(400, "Invalid Request", "Request body must be valid JSON.")
  }));
  if (!parsed.ok) return parsed.response;
  const { session, response } = await enforceRateLimit("pr_draft", "user_demo", request);
  if (response) return response;
  const realUserId = session?.user.id && session.user.id !== "user_demo" ? session.user.id : null;
  const storedIssue = realUserId ? await getStoredIssue(realUserId, issueId) : null;
  const issue = storedIssue ?? findIssue(issueId);
  if (!issue) return problem(404, "Not Found", "Issue not found for this user.");
  const existingPlan = realUserId ? await getStoredPlan(realUserId, issue.id) : getState().plans[issue.id];
  if (!existingPlan) return problem(404, "Not Found", "Plan not found for this user.");
  const plan = await regeneratePrDraft(issue, existingPlan, parsed.data);
  if (realUserId) {
    await saveImplementationPlan(realUserId, plan);
  }
  return json({
    prTitle: plan.prTitle,
    prDescription: plan.prDescription,
    generatedAt: plan.generatedAt
  });
}
