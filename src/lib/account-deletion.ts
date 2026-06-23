export type AccountDeletionTarget =
  | { ok: true; userId: string; storedUser: boolean }
  | { ok: false; status: 401; title: "Unauthorized"; detail: string };

export function resolveAccountDeletionTarget(userId: string | null | undefined): AccountDeletionTarget {
  if (!userId) {
    return {
      ok: false,
      status: 401,
      title: "Unauthorized",
      detail: "Sign in before deleting account data."
    };
  }

  return {
    ok: true,
    userId,
    storedUser: userId !== "user_demo"
  };
}
