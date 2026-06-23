import type { SkillProfile } from "@/lib/types";

export function isRealSessionUser(userId: string | null | undefined) {
  return Boolean(userId && userId !== "user_demo");
}

export function resolveProfileGetResult(userId: string | null | undefined, storedProfile: SkillProfile | null, demoProfile: SkillProfile) {
  if (!isRealSessionUser(userId)) {
    return { ok: true as const, profile: demoProfile };
  }
  if (!storedProfile) {
    return {
      ok: false as const,
      status: 404,
      title: "Not Found",
      detail: "No analysis run yet. Run profile analysis first."
    };
  }
  return { ok: true as const, profile: storedProfile };
}
