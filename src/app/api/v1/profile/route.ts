import { auth } from "@/auth";
import { json, parseJsonResult, problem } from "@/lib/api";
import { getStoredSkillProfile, updateStoredSkillPreferences } from "@/lib/db/app-data";
import { enforceSameOrigin } from "@/lib/origin-guard";
import { resolveProfileGetResult } from "@/lib/profile-api";
import { updateProfilePreferences, getState } from "@/lib/store";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = session?.user.id;
  const storedProfile = userId && userId !== "user_demo" ? await getStoredSkillProfile(userId) : null;
  const result = resolveProfileGetResult(userId, storedProfile, getState().profile);
  if (!result.ok) return problem(result.status, result.title, result.detail);
  return json(result.profile);
}

const preferencePatchSchema = z.object({
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
  preferredDomain: z.string().max(120).nullable().optional(),
  frameworks: z.union([z.array(z.string()), z.string()]).optional()
});

export async function PATCH(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;

  const parsed = await parseJsonResult(request, preferencePatchSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const session = await auth();
  if (session?.user.id && session.user.id !== "user_demo") {
    const profile = await updateStoredSkillPreferences(session.user.id, body);
    if (!profile) return problem(404, "Not Found", "Skill profile has not been analyzed yet.");
    return json(profile);
  }

  return json(updateProfilePreferences(body));
}
