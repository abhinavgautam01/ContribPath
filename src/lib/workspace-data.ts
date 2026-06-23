import { auth } from "@/auth";
import { getStoredIssues, getStoredRepos, getStoredSkillProfile } from "@/lib/db/app-data";
import { getState } from "@/lib/store";

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
      source: "demo" as const
    };
  }
  const user = session!.user;

  const [profile, repos, issues] = await Promise.all([
    getStoredSkillProfile(realUserId),
    getStoredRepos(realUserId),
    getStoredIssues(realUserId)
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
    source: repos.length || issues.length || profile ? ("stored" as const) : ("demo" as const)
  };
}
