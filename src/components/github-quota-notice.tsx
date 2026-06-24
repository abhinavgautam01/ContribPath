import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { GitHubQuotaSnapshot } from "@/lib/github-quota";

export function GitHubQuotaNotice({ quota }: { quota: GitHubQuotaSnapshot | null | undefined }) {
  if (!quota?.warning) return null;
  const resetTime = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(quota.resetAt));

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300/25 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">
      <WarningCircle size={20} className="mt-0.5 shrink-0" weight="duotone" />
      <div>
        <div className="font-medium">GitHub API quota is running low</div>
        <p className="mt-1 text-amber-100/80">
          {quota.remaining.toLocaleString()} of {quota.limit.toLocaleString()} requests remain. The quota resets around {resetTime}.
        </p>
      </div>
    </div>
  );
}
