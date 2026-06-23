import { auth } from "@/auth";
import { json, parseJsonResult, problem } from "@/lib/api";
import { getStoredIssue, getStoredRepos, updateStoredIssueFlags } from "@/lib/db/app-data";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { findIssue, getState, saveIssue } from "@/lib/store";
import { z } from "zod";

type RouteContext = { params: Promise<{ issueId: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const { issueId } = await params;
  const session = await auth();
  if (session?.user.id && session.user.id !== "user_demo") {
    const issue = await getStoredIssue(session.user.id, issueId);
    if (issue) {
      const repos = await getStoredRepos(session.user.id);
      return json({ ...issue, repo: repos.find((candidate) => candidate.id === issue.repoId) });
    }
  }
  const issue = findIssue(issueId);
  if (!issue) return problem(404, "Not Found", "Issue not in user's discovered list.");
  const repo = getState().repos.find((candidate) => candidate.id === issue.repoId);
  return json({ ...issue, repo });
}

const patchSchema = z.object({
  saved: z.boolean().optional(),
  dismissed: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: RouteContext) {
  const { issueId } = await params;
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const parsed = await parseJsonResult(request, patchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const session = await auth();
  if (session?.user.id && session.user.id !== "user_demo") {
    const issue = await updateStoredIssueFlags(session.user.id, issueId, body);
    if (!issue) return problem(404, "Not Found", "Issue not in user's discovered list.");
    return json(issue);
  }
  const issue = saveIssue(issueId, body);
  if (!issue) return problem(404, "Not Found", "Issue not in user's discovered list.");
  return json(issue);
}
