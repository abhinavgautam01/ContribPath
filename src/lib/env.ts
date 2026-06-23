import { z } from "zod";

const optionalSecret = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());
const optionalUrl = z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional());
const optionalFlag = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

const envSchema = z.object({
  GITHUB_CLIENT_ID: optionalSecret,
  GITHUB_CLIENT_SECRET: optionalSecret,
  AUTH_SECRET: optionalSecret,
  APP_URL: z.preprocess((value) => (value === "" || value === undefined ? "http://localhost:3000" : value), z.string().url()),
  DATABASE_URL: optionalSecret,
  CACHE_REDIS_URL: optionalSecret,
  QUEUE_REDIS_URL: optionalSecret,
  TOKEN_ENCRYPTION_KEY: optionalSecret,
  GITHUB_OAUTH_READ_ORG: optionalFlag,
  EMAIL_NOTIFICATIONS_ENABLED: optionalFlag,
  ANTHROPIC_API_KEY: optionalSecret,
  OPENAI_API_KEY: optionalSecret,
  LLM_PROVIDER: z.enum(["anthropic", "openai", "demo"]).default("anthropic"),
  SENTRY_DSN: optionalSecret,
  NEXT_PUBLIC_POSTHOG_KEY: optionalSecret,
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl
});

export const env = envSchema.parse(process.env);

export type RuntimeMode = "production-ready" | "demo";

export function getRuntimeMode(): RuntimeMode {
  return hasProductionCredentials() ? "production-ready" : "demo";
}

export function hasGitHubOAuth() {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

export function hasGitHubOrgScopeEnabled() {
  return env.GITHUB_OAUTH_READ_ORG;
}

export function hasEmailNotificationsEnabled() {
  return env.EMAIL_NOTIFICATIONS_ENABLED;
}

export function getGitHubOAuthScope() {
  const scopes = ["read:user"];
  if (hasGitHubOrgScopeEnabled()) scopes.push("read:org");
  if (hasEmailNotificationsEnabled()) scopes.push("user:email");
  return scopes.join(" ");
}

export function hasDatabase() {
  return Boolean(env.DATABASE_URL);
}

export function hasCacheRedis() {
  return Boolean(env.CACHE_REDIS_URL);
}

export function hasQueueRedis() {
  return Boolean(env.QUEUE_REDIS_URL);
}

export function hasTokenEncryption() {
  return Boolean(env.TOKEN_ENCRYPTION_KEY);
}

export function hasLlmProvider() {
  return Boolean(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY);
}

export function hasProductionCredentials() {
  return hasGitHubOAuth() && hasDatabase() && hasCacheRedis() && hasQueueRedis() && hasTokenEncryption() && hasLlmProvider();
}

export function getMissingProductionEnv() {
  const missing: string[] = [];
  if (!env.GITHUB_CLIENT_ID) missing.push("GITHUB_CLIENT_ID");
  if (!env.GITHUB_CLIENT_SECRET) missing.push("GITHUB_CLIENT_SECRET");
  if (!env.AUTH_SECRET) missing.push("AUTH_SECRET");
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.CACHE_REDIS_URL) missing.push("CACHE_REDIS_URL");
  if (!env.QUEUE_REDIS_URL) missing.push("QUEUE_REDIS_URL");
  if (!env.TOKEN_ENCRYPTION_KEY) missing.push("TOKEN_ENCRYPTION_KEY");
  if (!hasLlmProvider()) missing.push("ANTHROPIC_API_KEY or OPENAI_API_KEY");
  return missing;
}
