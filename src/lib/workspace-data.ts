import { auth } from "@/auth";
import { getStoredIssues, getStoredRepos, getStoredSkillProfile } from "@/lib/db/app-data";
import { getUserInFlightAgentJobs, isResumableJobStatus } from "@/lib/db/job-data";
import { getGitHubQuotaForUser } from "@/lib/github-quota";
import { getQueuedAgentJob } from "@/lib/queue/job-status";
import { findLatestInFlightJob, getState } from "@/lib/store";

async function getActiveQueuedJobId(userId: string) {
  const jobs = await getUserInFlightAgentJobs(userId);
  for (const job of jobs) {
    if (!job.queueJobId) continue;
    const queueJob = await getQueuedAgentJob(job.queueJobId);
    if (isResumableJobStatus(queueJob?.status)) return job.queueJobId;
  }
  return null;
}

export async function getCurrentWorkspace() {
  const session = await auth();
  const state = getState();
  const realUserId = session?.user.id && session.user.id !== "user_demo" ? session.user.id : null;

  if (!realUserId) {
    return {
      user: state.user,
      profile: state.profile,
      repos: state.repos,
      issues: state.issues,
      githubQuota: null,
      activeJobId: findLatestInFlightJob()?.id ?? null,
      source: "demo" as const
    };
  }
  const user = session!.user;

  const [profile, repos, issues, githubQuota, activeJobId] = await Promise.all([
    getStoredSkillProfile(realUserId),
    getStoredRepos(realUserId),
    getStoredIssues(realUserId),
    getGitHubQuotaForUser(realUserId).catch(() => null),
    getActiveQueuedJobId(realUserId).catch(() => null)
  ]);

  return {
    user: {
      id: realUserId,
      githubLogin: user.githubLogin,
      avatarUrl: user.image ?? state.user.avatarUrl,
      role: user.role
    },
    profile: profile ?? state.profile,
    repos: repos.length ? repos : state.repos,
    issues: issues.length ? issues : state.issues,
    githubQuota,
    activeJobId,
    source: repos.length || issues.length || profile ? ("stored" as const) : ("demo" as const)
  };
}
