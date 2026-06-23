import { Badge } from "@/components/badge";
import { healthTone } from "@/lib/utils";
import type { HealthBreakdown } from "@/lib/types";

export function HealthBadge({ score, breakdown }: { score: number; breakdown?: HealthBreakdown }) {
  const label = score > 70 ? "Healthy" : score >= 40 ? "Watch" : "Risk";
  return (
    <span className="group relative inline-flex">
      <Badge className={healthTone(score)}>
        {label} {score}
      </Badge>
      {breakdown ? (
        <span className="pointer-events-none absolute right-0 top-8 z-20 w-64 rounded-lg border border-border-subtle bg-surface-elevated p-3 text-xs text-text-secondary opacity-0 shadow-glow transition-opacity group-hover:opacity-100">
          <span className="block font-mono text-[0.68rem] uppercase tracking-wide text-text-primary">Health breakdown</span>
          <span className="mt-2 block">Last commit: {breakdown.lastCommit}</span>
          <span className="block">PR merge: {breakdown.prMergeRate}</span>
          <span className="block">Issue response: {breakdown.issueResponseTime}</span>
          <span className="block">Closed in 90d: {breakdown.issuesClosed90d}</span>
        </span>
      ) : null}
    </span>
  );
}
