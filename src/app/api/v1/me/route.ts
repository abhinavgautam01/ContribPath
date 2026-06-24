import { auth } from "@/auth";
import { json, problem } from "@/lib/api";
import { cleanupUserRuntimeData } from "@/lib/account-cleanup";
import { resolveAccountDeletionTarget } from "@/lib/account-deletion";
import { deleteUserData } from "@/lib/db/account-data";
import { markUserInFlightJobsCancelled } from "@/lib/db/job-data";
import { hasDatabase } from "@/lib/env";
import { enforceSameOrigin } from "@/lib/origin-guard";

function clearAuthCookies(response: ReturnType<typeof json>) {
  for (const name of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url"
  ]) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/"
    });
  }
}

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
