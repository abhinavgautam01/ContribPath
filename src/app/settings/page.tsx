import { AppNav } from "@/components/app-nav";
import { AccountDataActions } from "@/components/account-data-actions";
import { Badge } from "@/components/badge";
import { NotificationPreferencesPanel } from "@/components/notification-preferences-panel";
import { getMissingProductionEnv, getRuntimeMode, hasCacheRedis, hasDatabase, hasGitHubOAuth, hasLlmProvider, hasQueueRedis } from "@/lib/env";
import { getCurrentWorkspace } from "@/lib/workspace-data";

const envRows = [
  ["GitHub OAuth", "GITHUB_CLIENT_ID", hasGitHubOAuth()],
  ["Database", "DATABASE_URL", hasDatabase()],
  ["Cache Redis", "CACHE_REDIS_URL", hasCacheRedis()],
  ["Queue Redis", "QUEUE_REDIS_URL", hasQueueRedis()],
  ["LLM", "ANTHROPIC_API_KEY or OPENAI_API_KEY", hasLlmProvider()]
] as const;

export default async function SettingsPage() {
  const { user } = await getCurrentWorkspace();
  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Settings</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Connections and environment</h1>
        </div>
        <section className="rounded-2xl border border-border-subtle bg-surface p-8">
          <h2 className="font-display text-2xl font-bold">Connected account</h2>
          <p className="mt-2 text-text-secondary">
            @{user.githubLogin} is running in <span className="code-pointer">{getRuntimeMode()}</span> mode.
          </p>
          {getMissingProductionEnv().length ? (
            <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">
              Missing production values: {getMissingProductionEnv().join(", ")}.
            </div>
          ) : null}
          <div className="mt-6 grid gap-3">
            {envRows.map(([label, key, configured]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border-subtle bg-base/50 p-4">
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="font-mono text-xs text-text-muted">{key}</div>
                </div>
                <Badge className={configured ? "border-emerald-300/25 bg-emerald-300/5 text-emerald-200" : "border-amber-300/25 bg-amber-300/5 text-amber-200"}>
                  {configured ? "Configured" : "Demo"}
                </Badge>
              </div>
            ))}
          </div>
        </section>
        <div className="mt-6">
          <NotificationPreferencesPanel />
        </div>
        <div className="mt-6">
          <AccountDataActions />
        </div>
      </main>
    </>
  );
}
