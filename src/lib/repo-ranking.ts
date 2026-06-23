import type { Repository, SkillProfile } from "@/lib/types";

export function calculateSkillMatchScore(input: {
  repoLanguage: string | null | undefined;
  queryLanguage: string;
  repoName: string;
  description?: string | null;
  profile: Pick<SkillProfile, "languages" | "frameworks" | "preferredDomain">;
}) {
  const repoLanguage = input.repoLanguage ?? input.queryLanguage;
  const languageMatch = repoLanguage.toLowerCase() === input.queryLanguage.toLowerCase();
  const profileLanguageMatch = input.profile.languages.some((language) => language.name.toLowerCase() === repoLanguage.toLowerCase());
  const primaryLanguageScore = languageMatch ? 100 : profileLanguageMatch ? 80 : 40;

  const searchableText = `${input.repoName} ${input.description ?? ""}`;
  const normalizedSearchableText = normalizeSearchText(searchableText);
  const frameworkMatches = input.profile.frameworks.filter((framework) => normalizedSearchableText.includes(normalizeSearchText(framework)));
  const frameworkOverlapScore = input.profile.frameworks.length
    ? Math.round((frameworkMatches.length / input.profile.frameworks.length) * 100)
    : 50;

  const domain = input.profile.preferredDomain?.toLowerCase();
  const domainScore = domain && normalizedSearchableText.includes(normalizeSearchText(domain)) ? 100 : 50;

  return Math.round(primaryLanguageScore * 0.5 + frameworkOverlapScore * 0.3 + domainScore * 0.2);
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function calculateFinalRepoScore(skillMatchScore: number, healthScore: number) {
  return Math.round(skillMatchScore * 0.6 + healthScore * 0.4);
}

export function sortRepositoriesByFinalScore(repos: Repository[]) {
  return [...repos].sort((left, right) => right.finalScore - left.finalScore || right.healthScore - left.healthScore);
}
