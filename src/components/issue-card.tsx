import Link from "next/link";
import { ArrowRight, BookmarkSimple, Clock, GitMerge, Star } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/badge";
import { HealthBadge } from "@/components/health-badge";
import { IssueActions } from "@/components/issue-actions";
import { SpotlightCard } from "@/components/spotlight-card";
import { sanitizeIssueForDisplay, sanitizeRepoForDisplay } from "@/lib/display-sanitization";
import type { Issue, Repository } from "@/lib/types";
import { formatMinutes } from "@/lib/utils";

export function IssueCard({ issue, repo }: { issue: Issue; repo: Repository }) {
  const displayIssue = sanitizeIssueForDisplay(issue);
  const displayRepo = sanitizeRepoForDisplay(repo);

  return (
    <SpotlightCard className="group p-6">
      <div className="flex h-full flex-col gap-5">
        <Link href={`/issues/${displayIssue.id}`} className="block flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <GitMerge size={15} />
                  {displayRepo.fullName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star size={15} />
                  {displayRepo.stars.toLocaleString()}
                </span>
              </div>
              <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-text-primary">{displayIssue.title}</h3>
            </div>
            <ArrowRight className="mt-1 text-text-muted transition group-hover:translate-x-1 group-hover:text-accent-primary" size={24} />
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{displayIssue.aiSummary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <HealthBadge score={displayRepo.healthScore} breakdown={displayRepo.healthBreakdown} />
            <Badge>{displayIssue.difficulty}</Badge>
            <Badge className="gap-1">
              <Clock size={13} />
              {formatMinutes(displayIssue.timeEstimateMins)}
            </Badge>
            {displayIssue.saved ? (
              <Badge className="border-accent-secondary/25 bg-[var(--accent-secondary-bg)] text-accent-secondary">
                <BookmarkSimple size={13} weight="fill" />
                Saved
              </Badge>
            ) : null}
          </div>
        </Link>
        <div className="border-t border-border-subtle pt-4">
          <IssueActions issueId={displayIssue.id} initialSaved={displayIssue.saved} initialDismissed={displayIssue.dismissed} compact />
        </div>
      </div>
    </SpotlightCard>
  );
}
