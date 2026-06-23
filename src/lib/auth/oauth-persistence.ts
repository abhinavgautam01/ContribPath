import { eq } from "drizzle-orm";
import type { Account, Profile, User } from "next-auth";
import { getDb } from "@/lib/db/client";
import { oauthAccounts, users } from "@/lib/db/schema";
import { hasDatabase, hasTokenEncryption } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";

export interface GitHubProfileLike {
  id?: string | number | null;
  login?: string | null;
  avatar_url?: string | null;
  email?: string | null;
}

export interface OAuthPersistenceInput {
  user: User;
  account: Account | null;
  profile?: Profile | GitHubProfileLike;
}

export interface OAuthPersistenceResult {
  persisted: boolean;
  userId?: string;
  skippedReason?: string;
}

export function normalizeGitHubProfile(profile: Profile | GitHubProfileLike | undefined, user: User) {
  const profileLike = (profile ?? {}) as GitHubProfileLike;
  return {
    githubId: String(profileLike.id ?? user.id),
    githubLogin: profileLike.login ?? user.name ?? "unknown-github-user",
    email: profileLike.email ?? user.email ?? null,
    avatarUrl: profileLike.avatar_url ?? user.image ?? null
  };
}

export function expiresAtFromAccount(account: Account) {
  return typeof account.expires_at === "number" ? new Date(account.expires_at * 1000) : null;
}

export async function persistGitHubOAuthAccount(input: OAuthPersistenceInput): Promise<OAuthPersistenceResult> {
  if (input.account?.provider !== "github") {
    return { persisted: false, skippedReason: "not-github" };
  }
  if (!input.account.access_token) {
    return { persisted: false, skippedReason: "missing-access-token" };
  }
  if (!hasDatabase()) {
    return { persisted: false, skippedReason: "database-not-configured" };
  }
  if (!hasTokenEncryption()) {
    return { persisted: false, skippedReason: "token-encryption-not-configured" };
  }

  const db = getDb();
  if (!db) {
    return { persisted: false, skippedReason: "database-not-available" };
  }

  const normalized = normalizeGitHubProfile(input.profile, input.user);
  const [savedUser] = await db
    .insert(users)
    .values({
      githubId: normalized.githubId,
      githubLogin: normalized.githubLogin,
      email: normalized.email,
      avatarUrl: normalized.avatarUrl,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        githubLogin: normalized.githubLogin,
        email: normalized.email,
        avatarUrl: normalized.avatarUrl,
        deletedAt: null,
        updatedAt: new Date()
      }
    })
    .returning({ id: users.id });

  await db
    .insert(oauthAccounts)
    .values({
      userId: savedUser.id,
      provider: "github",
      providerAccountId: normalized.githubId,
      accessTokenEncrypted: encryptToken(input.account.access_token),
      refreshTokenEncrypted: input.account.refresh_token ? encryptToken(input.account.refresh_token) : null,
      scope: input.account.scope ?? "",
      tokenType: input.account.token_type ?? null,
      expiresAt: expiresAtFromAccount(input.account),
      revokedAt: null,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [oauthAccounts.provider, oauthAccounts.providerAccountId],
      set: {
        userId: savedUser.id,
        accessTokenEncrypted: encryptToken(input.account.access_token),
        refreshTokenEncrypted: input.account.refresh_token ? encryptToken(input.account.refresh_token) : null,
        scope: input.account.scope ?? "",
        tokenType: input.account.token_type ?? null,
        expiresAt: expiresAtFromAccount(input.account),
        revokedAt: null,
        updatedAt: new Date()
      }
    });

  await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, savedUser.id));
  return { persisted: true, userId: savedUser.id };
}

export async function getUserIdByGitHubId(githubId: string | number | null | undefined) {
  if (!githubId || !hasDatabase()) return null;
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.githubId, String(githubId)))
    .limit(1);
  return row?.id ?? null;
}

export async function getUserRoleById(userId: string | null | undefined) {
  if (!userId || !hasDatabase()) return null;
  const db = getDb();
  if (!db) return null;
  const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.role ?? null;
}

export async function getGitHubAccessTokenForUser(userId: string) {
  if (!hasDatabase() || !hasTokenEncryption()) return null;
  const db = getDb();
  if (!db) return null;
  const [row] = await db
    .select({ accessTokenEncrypted: oauthAccounts.accessTokenEncrypted })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId))
    .limit(1);
  return row?.accessTokenEncrypted ? decryptToken(row.accessTokenEncrypted) : null;
}
