import { Octokit } from "@octokit/rest";
import type { CodebaseNavigationFileContent } from "@/lib/codebase-navigation";
import { aggregateRepoHealth, daysBetween, median, unknownRepoHealth } from "@/lib/github-health";
import { extractReferencedIssueNumbersFromDiscussion, type IssueDiscussion } from "@/lib/issue-discussion";
import { calculateFinalRepoScore, calculateSkillMatchScore, sortRepositoriesByFinalScore } from "@/lib/repo-ranking";
import type { Difficulty, Issue, Repository, SkillProfile } from "@/lib/types";

const discoveryLabels = ["good first issue", "help wanted"] as const;
const fallbackDiscoveryLanguages = ["JavaScript", "Python"] as const;
const pythonAdjacentLanguages = new Set(["jupyter notebook", "markdown"]);

export interface GitHubProvider {
  getAuthenticatedUser(): Promise<{ login: string; id: number; avatarUrl: string; type: string }>;
  getSkillProfile(username: string): Promise<SkillProfile>;
  searchIssues(profile: SkillProfile): Promise<{ repos: Repository[]; issues: Issue[] }>;
  getRepositoryTree(fullName: string): Promise<string[]>;
  getRepositoryFileContent(fullName: string, path: string): Promise<CodebaseNavigationFileContent | null>;
  getIssueDiscussion(fullName: string, issueNumber: number): Promise<IssueDiscussion>;
}

export function discoverySearchLanguages(profile: Pick<SkillProfile, "languages">) {
  const languages = profile.languages
    .map((language) => language.name.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (!languages.length) return [...fallbackDiscoveryLanguages];
  if (languages.every((language) => pythonAdjacentLanguages.has(language.toLowerCase()))) return ["Python"];
  return languages;
}

export function buildIssueSearchQueries(languages: readonly string[]) {
  return languages.flatMap((language) =>
    discoveryLabels.map((label) => ({
      language,
      label,
      q: `is:issue is:open label:"${label}" language:${language} no:assignee`
    }))
  );
}

export function createGitHubProvider(accessToken: string): GitHubProvider {
  const octokit = new Octokit({ auth: accessToken });

  return {
    async getAuthenticatedUser() {
      const { data } = await octokit.users.getAuthenticated();
      return {
        login: data.login,
        id: data.id,
        avatarUrl: data.avatar_url,
        type: data.type
      };
    },

    async getSkillProfile(username: string) {
      const reposResponse = await octokit.repos.listForUser({
        username,
        sort: "pushed",
        per_page: 100
      });
      const repos = reposResponse.data.filter((repo) => !repo.fork || (repo.size ?? 0) > 0);
      const languageBytes = new Map<string, number>();

      await Promise.all(
        repos.slice(0, 20).map(async (repo) => {
          const languages = await octokit.repos.listLanguages({ owner: repo.owner.login, repo: repo.name }).catch(() => ({ data: {} }));
          Object.entries(languages.data).forEach(([language, bytes]) => {
            languageBytes.set(language, (languageBytes.get(language) ?? 0) + Number(bytes));
          });
        })
      );

      const totalBytes = [...languageBytes.values()].reduce((sum, bytes) => sum + bytes, 0) || 1;
      const languages = [...languageBytes.entries()]
        .map(([name, bytes]) => ({ name, bytes, percentage: Math.round((bytes / totalBytes) * 100) }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 5);

      const prs = await octokit.search
        .issuesAndPullRequests({
          q: `is:pr is:merged author:${username}`,
          per_page: 30
        })
        .catch(() => ({ data: { total_count: 0 } }));

      const totalMergedPRs = prs.data.total_count;
      const difficulty: Difficulty = totalMergedPRs > 20 ? "Advanced" : totalMergedPRs >= 5 ? "Intermediate" : "Beginner";

      return {
        languages,
        frameworks: inferFrameworks(repos.map((repo) => repo.name)),
        difficulty,
        preferredDomain: "Developer Tools",
        totalRepos: repos.length,
        totalMergedPRs,
        analyzedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    },

    async searchIssues(profile: SkillProfile) {
      const topLanguages = discoverySearchLanguages(profile);
      const seenRepos = new Map<number, Repository>();
      const seenIssues = new Set<string>();
      const issues: Issue[] = [];

      const runSearches = async (languages: readonly string[]) => {
        for (const query of buildIssueSearchQueries(languages)) {
          const response = await octokit.search.issuesAndPullRequests({
            q: query.q,
            per_page: 10
          });

          for (const item of response.data.items) {
            if (!item.repository_url || seenIssues.has(item.node_id)) continue;
            const [owner, repoName] = item.repository_url.split("/repos/")[1].split("/");
            const repoResponse = await octokit.repos.get({ owner, repo: repoName });
            const repo = repoResponse.data;
            if (repo.archived || repo.stargazers_count < 50) continue;
            if (repo.stargazers_count > 100000 && profile.difficulty !== "Advanced") continue;
            if ((repo.open_issues_count ?? 0) > 1000) continue;
            if (repo.pushed_at) {
              const pushedDays = daysBetween(repo.pushed_at, new Date());
              if (typeof pushedDays === "number" && pushedDays > 180) continue;
            }

            const health = await fetchRepositoryHealth(octokit, owner, repoName).catch(() =>
              unknownRepoHealth("GitHub health probes failed; detailed scoring unavailable.")
            );
            const skillMatchScore = calculateSkillMatchScore({
              repoLanguage: repo.language,
              queryLanguage: query.language,
              repoName: repo.full_name,
              description: repo.description,
              profile
            });

            const repoRecord: Repository = {
              id: `github_${repo.id}`,
              githubRepoId: repo.id,
              fullName: repo.full_name,
              description: repo.description ?? "",
              language: repo.language ?? query.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              healthScore: health.healthScore,
              healthBreakdown: health.healthBreakdown,
              skillMatchScore,
              finalScore: calculateFinalRepoScore(skillMatchScore, health.healthScore)
            };
            seenRepos.set(repo.id, repoRecord);
            seenIssues.add(item.node_id);

            issues.push({
              id: `github_${item.node_id}`,
              repoId: repoRecord.id,
              githubIssueNumber: item.number,
              githubNodeId: item.node_id,
              githubUrl: item.html_url,
              title: item.title,
              body: item.body ?? "",
              labels: item.labels.map((label) => (typeof label === "string" ? label : label.name ?? "")).filter(Boolean),
              difficulty: profile.difficulty,
              timeEstimateMins: profile.difficulty === "Beginner" ? 60 : 120,
              aiSummary: item.body?.slice(0, 220) || "Issue summary pending LLM analysis.",
              likelyFiles: [],
              issueContext: {
                problem: item.title,
                context: "Live issue imported from GitHub search.",
                gotchas: [],
                questionsToAsk: [],
                type: "maintenance"
              },
              explainedAt: null,
              saved: false,
              dismissed: false,
              state: item.state === "closed" ? "closed" : "open"
            });
          }
        }
      };

      await runSearches(topLanguages);
      if (!issues.length) {
        const fallbackLanguages = fallbackDiscoveryLanguages.filter((language) => !topLanguages.includes(language));
        await runSearches(fallbackLanguages);
      }

      const repos = sortRepositoriesByFinalScore([...seenRepos.values()]).slice(0, 20);
      const repoIds = new Set(repos.map((repo) => repo.id));
      const repoRank = new Map(repos.map((repo, index) => [repo.id, index]));
      const rankedIssues = issues
        .filter((issue) => repoIds.has(issue.repoId))
        .sort((left, right) => (repoRank.get(left.repoId) ?? Number.MAX_SAFE_INTEGER) - (repoRank.get(right.repoId) ?? Number.MAX_SAFE_INTEGER));
      return { repos, issues: rankedIssues };
    },

    async getRepositoryTree(fullName: string) {
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) return [];
      const repository = await octokit.repos.get({ owner, repo });
      const branch = repository.data.default_branch;
      const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
      const sha = typeof ref.data.object.sha === "string" ? ref.data.object.sha : branch;
      const tree = await octokit.git.getTree({ owner, repo, tree_sha: sha, recursive: "true" });
      return tree.data.tree
        .filter((entry) => entry.type === "blob" && typeof entry.path === "string")
        .map((entry) => entry.path!)
        .slice(0, 10000);
    },

    async getRepositoryFileContent(fullName: string, path: string) {
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo || !path) return null;
      const response = await octokit.repos.getContent({ owner, repo, path });
      const data = response.data;
      if (Array.isArray(data) || data.type !== "file") {
        return { path, skippedReason: `File content for ${path} is not directly accessible; inspect it manually in GitHub.` };
      }
      if ((data.size ?? 0) > 1024 * 1024) {
        return { path, sizeBytes: data.size, skippedReason: `File ${path} is larger than 1MB; inspect the GitHub blob manually.` };
      }
      if (!("content" in data) || typeof data.content !== "string") {
        return { path, skippedReason: `File content for ${path} could not be decoded; inspect it manually in GitHub.` };
      }
      return {
        path,
        content: Buffer.from(data.content, "base64").toString("utf8"),
        sizeBytes: data.size
      };
    },

    async getIssueDiscussion(fullName: string, issueNumber: number) {
      const [owner, repo] = fullName.split("/");
      if (!owner || !repo) return { body: "", comments: [], linkedPullRequests: [] };
      const [issue, comments] = await Promise.all([
        octokit.issues.get({ owner, repo, issue_number: issueNumber }),
        octokit.paginate(octokit.issues.listComments, { owner, repo, issue_number: issueNumber, per_page: 100 })
      ]);
      const discussion = {
        body: issue.data.body ?? "",
        comments: comments.map((comment) => ({
          author: comment.user?.login ?? "unknown",
          body: comment.body ?? ""
        }))
      };
      const linkedPullRequests = (
        await Promise.all(
          extractReferencedIssueNumbersFromDiscussion(discussion, issueNumber).map((pullNumber) =>
            octokit.pulls
              .get({ owner, repo, pull_number: pullNumber })
              .then((response) => ({
                number: response.data.number,
                title: response.data.title,
                state: response.data.state,
                merged: Boolean(response.data.merged_at),
                body: response.data.body ?? ""
              }))
              .catch(() => null)
          )
        )
      ).filter((pull): pull is NonNullable<typeof pull> => Boolean(pull));
      return {
        ...discussion,
        linkedPullRequests
      };
    }
  };
}

async function fetchRepositoryHealth(octokit: Octokit, owner: string, repo: string) {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const commits = await octokit.repos.listCommits({ owner, repo, per_page: 1 }).catch(() => ({ data: [] }));
  const lastCommitDate = commits.data[0]?.commit?.committer?.date ?? commits.data[0]?.commit?.author?.date ?? null;
  const daysSinceLastCommit = lastCommitDate ? daysBetween(lastCommitDate, now) : null;

  const pullRequests = await octokit.pulls.list({ owner, repo, state: "closed", sort: "updated", direction: "desc", per_page: 20 }).catch(() => ({ data: [] }));
  const mergeDurations = pullRequests.data
    .filter((pull) => pull.merged_at)
    .map((pull) => daysBetween(pull.created_at, pull.merged_at!))
    .filter((value): value is number => typeof value === "number");

  const issues = await octokit.issues
    .listForRepo({ owner, repo, state: "all", since: ninetyDaysAgo.toISOString(), sort: "updated", direction: "desc", per_page: 30 })
    .catch(() => ({ data: [] }));
  const standaloneIssues = issues.data.filter((issue) => !issue.pull_request);
  const closedIssues = standaloneIssues.filter((issue) => issue.state === "closed").length;
  const issuesClosedPercent90d = standaloneIssues.length ? (closedIssues / standaloneIssues.length) * 100 : null;

  const responseDurations = await Promise.all(
    standaloneIssues.slice(0, 10).map(async (issue) => {
      const comments = await octokit.issues
        .listComments({ owner, repo, issue_number: issue.number, per_page: 1 })
        .catch(() => ({ data: [] }));
      const firstComment = comments.data[0]?.created_at;
      return firstComment ? daysBetween(issue.created_at, firstComment) : null;
    })
  );

  const notes: string[] = [];
  if (!mergeDurations.length) notes.push("No recent merged PRs; PR merge signal uses neutral score.");
  if (!responseDurations.some((value): value is number => typeof value === "number")) {
    notes.push("No recent issue response samples; response signal uses neutral score.");
  }

  return aggregateRepoHealth({
    daysSinceLastCommit,
    medianPrMergeDays: median(mergeDurations),
    medianIssueResponseDays: median(responseDurations.filter((value): value is number => typeof value === "number")),
    issuesClosedPercent90d,
    notes: notes.length ? notes : undefined
  });
}

function inferFrameworks(repoNames: string[]) {
  const joined = repoNames.join(" ").toLowerCase();
  const frameworks = new Set<string>();
  if (joined.includes("next")) frameworks.add("Next.js");
  if (joined.includes("react")) frameworks.add("React");
  if (joined.includes("node")) frameworks.add("Node.js");
  if (joined.includes("go")) frameworks.add("Go");
  if (joined.includes("rust")) frameworks.add("Rust");
  return [...frameworks];
}
