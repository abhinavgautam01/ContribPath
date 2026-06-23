import postgres from "postgres";
import { env, getMissingProductionEnv, getRuntimeMode, hasCacheRedis, hasDatabase, hasGitHubOAuth, hasLlmProvider, hasQueueRedis, hasTokenEncryption } from "@/lib/env";
import { getCacheRedis, getQueueRedis } from "@/lib/queue/redis";

export type DependencyStatus = "ok" | "demo-mode" | "failed";

export type ReadinessDependency = {
  configured: boolean;
  probe?: () => Promise<void>;
};

export type ReadinessDependencyResult = {
  status: DependencyStatus;
  error?: string;
};

export function summarizeReadiness(results: Record<string, ReadinessDependencyResult>) {
  return Object.values(results).some((result) => result.status === "failed") ? "not_ready" : "ready";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function checkDependency(dependency: ReadinessDependency, timeoutMs = 2500): Promise<ReadinessDependencyResult> {
  if (!dependency.configured) return { status: "demo-mode" };
  if (!dependency.probe) return { status: "ok" };
  try {
    await withTimeout(dependency.probe(), timeoutMs, "Readiness check");
    return { status: "ok" };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown readiness failure"
    };
  }
}

async function probeDatabase() {
  const sql = postgres(env.DATABASE_URL!, {
    prepare: false,
    max: 1,
    connect_timeout: 2,
    idle_timeout: 1
  });
  try {
    await sql`select 1`;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function probeGitHub() {
  const response = await fetch("https://api.github.com/rate_limit", {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "contribpath-readiness"
    },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
}

export async function getReadinessReport() {
  const dependencies: Record<string, ReadinessDependency> = {
    database: { configured: hasDatabase(), probe: probeDatabase },
    cacheRedis: { configured: hasCacheRedis(), probe: async () => void (await getCacheRedis()!.ping()) },
    queueRedis: { configured: hasQueueRedis(), probe: async () => void (await getQueueRedis()!.ping()) },
    github: { configured: hasGitHubOAuth(), probe: probeGitHub },
    tokenEncryption: { configured: hasTokenEncryption() },
    llm: { configured: hasLlmProvider() }
  };

  const entries = await Promise.all(
    Object.entries(dependencies).map(async ([name, dependency]) => [name, await checkDependency(dependency)] as const)
  );
  const dependencyResults = Object.fromEntries(entries) as Record<string, ReadinessDependencyResult>;

  return {
    status: summarizeReadiness(dependencyResults),
    mode: getRuntimeMode(),
    missingProductionEnv: getMissingProductionEnv(),
    dependencies: dependencyResults
  };
}
