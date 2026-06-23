import type { Difficulty, SkillProfile } from "@/lib/types";

export interface DiscoveryPreferencePatch {
  languages?: string[];
  difficulty?: Difficulty;
  refresh?: boolean;
}

export function normalizeDiscoveryLanguages(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const languages: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const language = item.trim().replace(/\s+/g, " ").slice(0, 40);
    const key = language.toLowerCase();
    if (!language || seen.has(key)) continue;
    seen.add(key);
    languages.push(language);
    if (languages.length >= 6) break;
  }

  return languages;
}

export function applyDiscoveryPreferences(profile: SkillProfile, preferences: DiscoveryPreferencePatch = {}): SkillProfile {
  const requestedLanguages = normalizeDiscoveryLanguages(preferences.languages);
  const languages = requestedLanguages.length
    ? requestedLanguages.map((name) => {
        const existing = profile.languages.find((language) => language.name.toLowerCase() === name.toLowerCase());
        return existing ?? { name, percentage: 0 };
      })
    : profile.languages;

  return {
    ...profile,
    languages,
    difficulty: preferences.difficulty ?? profile.difficulty
  };
}

export function isProfileExpired(profile: Pick<SkillProfile, "expiresAt">, now = Date.now()) {
  const expiresAt = new Date(profile.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= now;
}
