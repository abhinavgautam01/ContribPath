import { auth } from "@/auth";
import { json, parseJsonResult, problem } from "@/lib/api";
import { getStoredIssues, getStoredRepos, updateStoredIssueFlags } from "@/lib/db/app-data";
import { defaultIssueFilters, issueMatchesFilters } from "@/lib/issue-filters";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { paginate, parsePaginationParams, parsePositiveInteger } from "@/lib/pagination";
import { getState, saveIssue } from "@/lib/store";
import { z } from "zod";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePaginationParams(searchParams);
  const filters = {
    ...defaultIssueFilters,
    q: searchParams.get("q")?.trim() ?? defaultIssueFilters.q,
    difficulty: searchParams.get("difficulty") ?? defaultIssueFilters.difficulty,
    language: searchParams.get("language") ?? defaultIssueFilters.language,
    saved: searchParams.get("saved") === "true",
    minHealth: parsePositiveInteger(searchParams.get("min_health"), defaultIssueFilters.minHealth)
  };
  const session = await auth();
  const isRealUser = Boolean(session?.user.id && session.user.id !== "user_demo");
  const storedRepos = isRealUser ? await getStoredRepos(session!.user.id) : [];
  const storedIssues = isRealUser ? await getStoredIssues(session!.user.id) : [];
  const state = getState();
  const sourceRepos = storedRepos.length ? storedRepos : state.repos;
  const sourceIssues = storedIssues.length ? storedIssues : state.issues;

  const filtered = sourceIssues.filter((issue) => {
    const repo = sourceRepos.find((candidate) => candidate.id === issue.repoId);
    return issueMatchesFilters(issue, repo, filters);
  });

  const { items, pagination } = paginate(filtered, page, limit);
  const issues = items.map((issue) => ({
    id: issue.id,
    title: issue.title,
    repo: sourceRepos.find((repo) => repo.id === issue.repoId),
    labels: issue.labels,
    difficulty: issue.difficulty,
    timeEstimateMins: issue.timeEstimateMins,
    aiSummary: issue.aiSummary,
    saved: issue.saved
  }));

  return json({
    issues,
    pagination
  });
}

const issueFlagPatchSchema = z.object({
  saved: z.boolean().optional(),
  dismissed: z.boolean().optional()
});

const patchSchema = z.union([
  z.object({
    issueId: z.string(),
    issueIds: z.undefined().optional()
  }).merge(issueFlagPatchSchema),
  z.object({
    issueId: z.undefined().optional(),
    issueIds: z.array(z.string()).min(1).max(500)
  }).merge(issueFlagPatchSchema)
]);

function flagPatch(body: z.infer<typeof patchSchema>) {
  return { saved: body.saved, dismissed: body.dismissed };
}

export async function PATCH(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const parsed = await parseJsonResult(request, patchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const issueIds = "issueIds" in body && body.issueIds ? body.issueIds : [body.issueId];
  const session = await auth();
  if (session?.user.id && session.user.id !== "user_demo") {
    const updated = [];
    for (const issueId of issueIds) {
      const issue = await updateStoredIssueFlags(session.user.id, issueId, flagPatch(body));
      if (issue) updated.push(issue);
    }
    if (!updated.length) return problem(404, "Not Found", "Issue not found for this user.");
    return json({ issues: updated, updated: updated.length });
  }
  const updated = issueIds.map((issueId) => saveIssue(issueId, flagPatch(body))).filter(Boolean);
  if (!updated.length) return problem(404, "Not Found", "Issue not found for this user.");
  return json({ issues: updated, updated: updated.length });
}
