import type { Difficulty, SkillProfile } from "@/lib/types";

export const difficultyOptions: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export interface ProfilePreferencePatch {
  difficulty?: Difficulty;
  preferredDomain?: string | null;
  frameworks?: string[] | string;
}

export function normalizePreferredDomain(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.slice(0, 80) : null;
}

export function normalizeFrameworks(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  const frameworks: string[] = [];

  for (const item of values) {
    if (typeof item !== "string") continue;
    const framework = item.trim().replace(/\s+/g, " ").slice(0, 40);
    const key = framework.toLowerCase();
    if (!framework || seen.has(key)) continue;
    seen.add(key);
    frameworks.push(framework);
    if (frameworks.length >= 12) break;
  }

  return frameworks;
}

export function applyProfilePreferencePatch(profile: SkillProfile, patch: ProfilePreferencePatch): SkillProfile {
  return {
    ...profile,
    difficulty: patch.difficulty ?? profile.difficulty,
    preferredDomain: Object.prototype.hasOwnProperty.call(patch, "preferredDomain")
      ? normalizePreferredDomain(patch.preferredDomain)
      : profile.preferredDomain,
    frameworks: Object.prototype.hasOwnProperty.call(patch, "frameworks")
      ? normalizeFrameworks(patch.frameworks)
      : profile.frameworks
  };
}
