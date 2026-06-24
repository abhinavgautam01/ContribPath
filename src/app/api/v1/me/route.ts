import { auth } from "@/auth";
import { json, problem } from "@/lib/api";
import { cleanupUserRuntimeData } from "@/lib/account-cleanup";
import { resolveAccountDeletionTarget } from "@/lib/account-deletion";
import { clearAuthCookies } from "@/lib/auth/session-cookies";
import { deleteUserData } from "@/lib/db/account-data";
import { markUserInFlightJobsCancelled } from "@/lib/db/job-data";
import { hasDatabase } from "@/lib/env";
import { enforceSameOrigin } from "@/lib/origin-guard";

export async function DELETE(request: Request) {
  const originError = enforceSameOrigin(request);
  if (originError) return originError;
  const session = await auth();
  const target = resolveAccountDeletionTarget(session?.user.id);
  if (!target.ok) return problem(target.status, target.title, target.detail);
  if (hasDatabase() && target.storedUser) {
    await markUserInFlightJobsCancelled(target.userId);
    await cleanupUserRuntimeData(target.userId);
    await deleteUserData(target.userId);
  }
  const response = json({ status: "deleted" });
  clearAuthCookies(response);
  return response;
}
