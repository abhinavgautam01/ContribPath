import { completeJob, createJob, getState, setJobRunning, updateIssueExplanation, upsertPlan } from "@/lib/store";
import { getGitHubAccessTokenForUser } from "@/lib/auth/oauth-persistence";
import { validateLikelyFilesAgainstTree } from "@/lib/codebase-navigation";
import { getStoredRepos, getStoredSkillProfile, saveDiscoveryResults, saveImplementationPlan, saveSkillProfile, updateStoredIssueExplanation } from "@/lib/db/app-data";
import { persistAgentJob } from "@/lib/db/job-data";
import { applyDiscoveryPreferences, type DiscoveryPreferencePatch } from "@/lib/discovery-preferences";
import { issueWithDiscussion } from "@/lib/issue-discussion";
import { testCommandForIssue } from "@/lib/plan-test-command";
import { assertAnalyzableGitHubAccount } from "@/lib/profile-analysis";
import { formatPrDraftDescription, type PrDraftOptions } from "@/lib/pr-draft";
import { createGitHubProvider } from "@/lib/providers/github";
import { createLlmProvider } from "@/lib/providers/llm";
import type { AgentJob, ImplementationPlan, Issue, PlanStep } from "@/lib/types";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runProfileAnalysis(): Promise<AgentJob> {
  const job = createJob("profile_analysis", "Queued profile analysis");
  setJobRunning(job.id, "Analysing public repositories...", 0.35);
  await sleep(80);
  setJobRunning(job.id, "Inferring languages and frameworks...", 0.72);
  await sleep(80);
  return completeJob(job.id, "Profile analysis complete", getState().profile, "profile");
}

export async function runProfileAnalysisForUser(userId: string): Promise<AgentJob> {
  const job = createJob("profile_analysis", "Queued profile analysis");
  setJobRunning(job.id, "Loading encrypted GitHub token...", 0.18);
  const token = await getGitHubAccessTokenForUser(userId);
  if (!token) {
    throw new Error("No GitHub access token is available for this user.");
  }
  const github = createGitHubProvider(token);
  setJobRunning(job.id, "Fetching authenticated GitHub profile...", 0.35);
  const user = await github.getAuthenticatedUser();
  assertAnalyzableGitHubAccount(user);
  setJobRunning(job.id, "Analysing repositories and merged PRs...", 0.72);
  const profile = await github.getSkillProfile(user.login);
  await saveSkillProfile(userId, profile);
  const completed = completeJob(job.id, "Profile analysis complete", profile, "profile");
  await persistAgentJob(userId, completed, { agentName: "SkillAnalysisAgent" });
  return completed;
}

export async function runIssueDiscovery(preferences: DiscoveryPreferencePatch = {}): Promise<AgentJob> {
  const job = createJob("issue_discovery", "Queued issue discovery");
  setJobRunning(job.id, "Searching good-first issues...", 0.28);
  await sleep(80);
  setJobRunning(job.id, "Scoring maintainer activity...", 0.68);
  await sleep(80);
  const state = getState();
  const profile = applyDiscoveryPreferences(state.profile, preferences);
  const issues = state.issues.filter((issue) => {
    const repo = state.repos.find((candidate) => candidate.id === issue.repoId);
    const languageMatch = !preferences.languages?.length || profile.languages.some((language) => language.name === repo?.language);
    const difficultyMatch = !preferences.difficulty || issue.difficulty === preferences.difficulty;
    return languageMatch && difficultyMatch;
  });
  const repoIds = new Set(issues.map((issue) => issue.repoId));
  const repos = state.repos.filter((repo) => repoIds.has(repo.id));
  return completeJob(job.id, "Issue discovery complete", { issues, repos, refresh: Boolean(preferences.refresh) }, "issues");
}

export async function runIssueDiscoveryForUser(userId: string, preferences: DiscoveryPreferencePatch = {}): Promise<AgentJob> {
  const job = createJob("issue_discovery", "Queued issue discovery");
  setJobRunning(job.id, "Loading skill profile and GitHub token...", 0.18);
  const [token, profile] = await Promise.all([getGitHubAccessTokenForUser(userId), getStoredSkillProfile(userId)]);
  if (!token) {
    throw new Error("No GitHub access token is available for this user.");
  }
  if (!profile) {
    throw new Error("Skill profile not found. Run profile analysis first.");
  }
  setJobRunning(job.id, "Searching GitHub for candidate issues...", 0.48);
  const discovery = await createGitHubProvider(token).searchIssues(applyDiscoveryPreferences(profile, preferences));
  setJobRunning(job.id, "Persisting ranked repository and issue matches...", 0.82);
  const saved = await saveDiscoveryResults(userId, discovery.repos, discovery.issues);
  const completed = completeJob(job.id, "Issue discovery complete", saved, "issues");
  await persistAgentJob(userId, completed, { agentName: "RepositoryDiscoveryAgent", preferences });
  return completed;
}

export async function runIssueExplanation(issue: Issue): Promise<AgentJob> {
  const job = createJob("issue_explanation", "Queued issue explanation");
  setJobRunning(job.id, "Reading issue discussion...", 0.34);
  await sleep(60);
  setJobRunning(job.id, "Summarising issue with LLM provider...", 0.62);
  const issueContext = await createLlmProvider().explainIssue(issue);
  const explainedIssue = updateIssueExplanation(issue.id, issueContext) ?? issue;
  setJobRunning(job.id, "Validating likely files...", 0.78);
  await sleep(60);
  return completeJob(job.id, "Issue explanation complete", explainedIssue, issue.id);
}

export async function runIssueExplanationForUser(userId: string, issue: Issue): Promise<AgentJob> {
  const job = createJob("issue_explanation", "Queued issue explanation");
  setJobRunning(job.id, "Reading issue discussion...", 0.34);
  const [token, repos] = await Promise.all([getGitHubAccessTokenForUser(userId), getStoredRepos(userId)]);
  const repo = repos.find((candidate) => candidate.id === issue.repoId);
  const github = token ? createGitHubProvider(token) : null;
  const issueForExplanation =
    github && repo
      ? issueWithDiscussion(issue, await github.getIssueDiscussion(repo.fullName, issue.githubIssueNumber).catch(() => ({ body: issue.body, comments: [] })))
      : issue;
  setJobRunning(job.id, "Summarising issue with LLM provider...", 0.62);
  const issueContext = await createLlmProvider().explainIssue(issueForExplanation);
  setJobRunning(job.id, "Validating suggested files against GitHub tree...", 0.78);
  let nextIssueContext = issueContext;
  let nextLikelyFiles = issue.likelyFiles;
  if (github && repo) {
    const treePaths = await github.getRepositoryTree(repo.fullName).catch(() => []);
    if (treePaths.length) {
      const navigation = validateLikelyFilesAgainstTree({ ...issue, issueContext }, treePaths);
      nextIssueContext = { ...issueContext, ...navigation.issueContextPatch };
      nextLikelyFiles = navigation.likelyFiles;
    }
  }
  const explainedIssue = await updateStoredIssueExplanation(userId, issue.id, nextIssueContext, nextLikelyFiles);
  setJobRunning(job.id, "Persisting issue understanding...", 0.86);
  await sleep(60);
  const completed = completeJob(job.id, "Issue explanation complete", explainedIssue ?? { ...issue, issueContext }, issue.id);
  await persistAgentJob(userId, completed, { agentName: "IssueUnderstandingAgent", issueId: issue.id });
  return completed;
}

function planForIssue(issue: Issue): ImplementationPlan {
  const existing = getState().plans[issue.id];
  if (existing) return existing;

  const primaryFile = issue.likelyFiles[0]?.path ?? "README.md";
  const steps: PlanStep[] = [
    {
      step: 1,
      title: "Reproduce the issue locally",
      description: `Open the repository and confirm the current behaviour described in #${issue.githubIssueNumber}.`,
      files: [primaryFile],
      tips: ["Read the contribution guide before changing code."]
    },
    {
      step: 2,
      title: "Modify the focused implementation path",
      description: `Update ${primaryFile} using the maintainer context and keep the change scoped to the issue.`,
      files: issue.likelyFiles.map((file) => file.path),
      tips: issue.issueContext.gotchas.slice(0, 2)
    },
    {
      step: 3,
      title: "Run the project tests",
      description: "Run the closest existing test command and add coverage if the repository has a relevant test suite.",
      files: issue.likelyFiles.map((file) => file.path),
      command: testCommandForIssue(issue),
      tips: ["Include the exact command output in the PR description."]
    }
  ];

  return upsertPlan({
    id: `plan_${issue.id}`,
    issueId: issue.id,
    steps,
    prTitle: `${issue.issueContext.type === "docs" ? "docs" : "fix"}: ${issue.title.toLowerCase()}`,
    prDescription: `## Summary\n\n${issue.aiSummary}\n\n## Changes\n\n- Updates ${primaryFile}\n- Follows the generated implementation plan\n\n## Testing\n\n- ${steps[2]?.command ?? "Manual verification"}\n\n## Related Issue\n\nCloses #${issue.githubIssueNumber}`,
    generatedAt: new Date().toISOString()
  });
}

export async function runPlanner(issue: Issue): Promise<AgentJob> {
  const job = createJob("plan", "Queued implementation planner");
  setJobRunning(job.id, "Combining issue and file context...", 0.4);
  await sleep(70);
  const plan = await createLlmProvider().createPlan(issue).catch(() => planForIssue(issue));
  upsertPlan(plan);
  setJobRunning(job.id, "Drafting PR summary...", 0.85);
  await sleep(70);
  return completeJob(job.id, "Implementation plan complete", plan, issue.id);
}

export async function runPlannerForUser(userId: string, issue: Issue): Promise<AgentJob> {
  const job = await runPlanner(issue);
  const plan = job.result as ImplementationPlan | undefined;
  if (plan) {
    await saveImplementationPlan(userId, plan);
    await persistAgentJob(userId, job, { agentName: "ImplementationPlannerAgent", issueId: issue.id });
  }
  return job;
}

export async function regeneratePrDraft(issue: Issue, existingPlan?: ImplementationPlan, options: PrDraftOptions = {}): Promise<ImplementationPlan> {
  const sourcePlan = existingPlan ?? planForIssue(issue);
  const plan = {
    ...sourcePlan,
    prDescription: formatPrDraftDescription(issue, sourcePlan, options),
    generatedAt: new Date().toISOString()
  };
  return upsertPlan(plan);
}
