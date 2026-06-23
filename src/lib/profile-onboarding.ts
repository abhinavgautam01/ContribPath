import type { SkillProfile } from "@/lib/types";

export function hasNoPublicRepoSignal(profile: Pick<SkillProfile, "totalRepos" | "languages">) {
  return profile.totalRepos === 0 && profile.languages.length === 0;
}

export const firstPublicRepoMessage = "Make your first public repo to get started.";
