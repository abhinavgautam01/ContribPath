import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { getUserIdByGitHubId, getUserRoleById, persistGitHubOAuthAccount } from "@/lib/auth/oauth-persistence";
import { normalizeRole } from "@/lib/auth/roles";
import { env, getGitHubOAuthScope, hasGitHubOAuth } from "@/lib/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      githubLogin: string;
      role: "user" | "admin";
    } & DefaultSession["user"];
  }
}

const providers = hasGitHubOAuth()
  ? [
      GitHub({
        clientId: env.GITHUB_CLIENT_ID!,
        clientSecret: env.GITHUB_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: getGitHubOAuthScope()
          }
        }
      })
    ]
  : [
      Credentials({
        id: "demo",
        name: "Demo",
        credentials: {},
        async authorize() {
          return {
            id: "user_demo",
            name: "demo-contributor",
            email: "demo@contribpath.local",
            image: "https://github.com/github.png"
          };
        }
      })
    ];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: env.AUTH_SECRET ?? "development-demo-secret-change-before-production",
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const result = await persistGitHubOAuthAccount({ user, account: account ?? null, profile }).catch((error: unknown) => {
        console.error(
          JSON.stringify({
            level: "error",
            event: "oauth_persistence_failed",
            error: error instanceof Error ? error.message : "Unknown error"
          })
        );
        return { persisted: false, skippedReason: "persistence-error" };
      });

      if (result.skippedReason === "database-not-configured" || result.skippedReason === "token-encryption-not-configured") {
        return true;
      }
      if (result.skippedReason === "not-github") {
        return true;
      }
      return result.persisted || !hasGitHubOAuth();
    },
    async jwt({ token, profile, user }) {
      if (profile && "login" in profile && typeof profile.login === "string") {
        token.githubLogin = profile.login;
      }
      if (profile && "id" in profile) {
        const localUserId = await getUserIdByGitHubId(profile.id as string | number | null | undefined);
        if (localUserId) {
          token.sub = localUserId;
          token.role = normalizeRole(await getUserRoleById(localUserId));
        }
      }
      if (user?.id) {
        token.sub ??= user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "user_demo";
      session.user.githubLogin = typeof token.githubLogin === "string" ? token.githubLogin : session.user.name ?? "demo-contributor";
      session.user.role = normalizeRole(token.role);
      return session;
    }
  }
});
