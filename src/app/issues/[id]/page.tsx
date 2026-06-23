import { notFound } from "next/navigation";
import { ArrowSquareOut, ChatCircleText, Question, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/badge";
import { HealthBadge } from "@/components/health-badge";
import { IssueActions } from "@/components/issue-actions";
import { IssueExplanationButton } from "@/components/issue-explanation-button";
import { MagneticLink } from "@/components/magnetic-button";
import { PlanGenerator } from "@/components/plan-generator";
import { PlanTimeline } from "@/components/plan-timeline";
import { PRDraftCard } from "@/components/pr-draft-card";
import { getStoredIssue, getStoredPlan, getStoredRepos } from "@/lib/db/app-data";
import { sanitizeIssueForDisplay, sanitizeRepoForDisplay } from "@/lib/display-sanitization";
import { buildGitHubBlobUrl } from "@/lib/github-url";
import { hasIssueExplanation } from "@/lib/issue-workflow";
import { getState } from "@/lib/store";
import { formatMinutes } from "@/lib/utils";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const realUserId = session?.user.id && session.user.id !== "user_demo" ? session.user.id : null;
  const state = getState();
  const storedIssue = realUserId ? await getStoredIssue(realUserId, id) : null;
  const storedRepos = storedIssue && realUserId ? await getStoredRepos(realUserId) : [];
  const issue = storedIssue ?? state.issues.find((candidate) => candidate.id === id);
  if (!issue) notFound();
  const repo = storedRepos.find((candidate) => candidate.id === issue.repoId) ?? state.repos.find((candidate) => candidate.id === issue.repoId);
  if (!repo) notFound();
  const plan = realUserId ? await getStoredPlan(realUserId, issue.id) : state.plans[issue.id];
  const explained = hasIssueExplanation(issue);
  const displayIssue = sanitizeIssueForDisplay(issue);
  const displayRepo = sanitizeRepoForDisplay(repo);

  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge>{displayIssue.difficulty}</Badge>
              <Badge>{formatMinutes(displayIssue.timeEstimateMins)}</Badge>
              <HealthBadge score={displayRepo.healthScore} breakdown={displayRepo.healthBreakdown} />
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight md:text-5xl">{displayIssue.title}</h1>
            <p className="mt-5 text-lg leading-8 text-text-secondary">{displayIssue.issueContext.problem}</p>
            <div className="mt-8 rounded-2xl border border-border-subtle bg-surface p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Issue context</p>
                  {!explained ? <p className="mt-2 text-sm text-text-muted">Run the understanding agent before generating an implementation plan.</p> : null}
                </div>
                {!explained ? <IssueExplanationButton issueId={issue.id} /> : <Badge className="border-emerald-300/25 bg-emerald-300/5 text-emerald-200">Explained</Badge>}
              </div>
              <p className="mt-4 leading-7 text-text-secondary">{displayIssue.issueContext.context}</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <h2 className="font-display text-xl font-bold">Likely files</h2>
                  <div className="mt-3 space-y-3">
                    {displayIssue.likelyFiles.map((file) => {
                      const href = buildGitHubBlobUrl(displayRepo.fullName, file.path);
                      return (
                        <div key={file.path} className="rounded-lg border border-border-subtle bg-base/50 p-3">
                          {href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="code-pointer inline-flex items-center gap-1" title="Open in GitHub">
                              {file.path}
                              <ArrowSquareOut size={13} />
                            </a>
                          ) : (
                            <span className="code-pointer">{file.path}</span>
                          )}
                          <p className="mt-2 text-sm text-text-secondary">{file.reason}</p>
                          {file.navigationHint ? (
                            <div className="mt-3 space-y-2 rounded-md border border-border-subtle bg-base/60 p-3 text-xs text-text-secondary">
                              <p>
                                <span className="font-medium text-text-primary">Section:</span> {file.navigationHint.section}
                              </p>
                              <p>{file.navigationHint.reason}</p>
                              {file.navigationHint.dependencies.length ? (
                                <p>
                                  <span className="font-medium text-text-primary">Dependencies:</span> {file.navigationHint.dependencies.join(", ")}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Gotchas</h2>
                  <div className="mt-3 space-y-2 text-sm text-text-secondary">
                    {displayIssue.issueContext.gotchas.map((gotcha, index) => (
                      <details key={`${gotcha}-${index}`} className="rounded-lg border border-border-subtle bg-base/40 p-3">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-text-primary">
                          <WarningCircle className="shrink-0 text-accent-primary" size={16} />
                          Read before changing code
                        </summary>
                        <p className="mt-2 pl-6 leading-6">{gotcha}</p>
                      </details>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-border-subtle bg-base/40 p-4">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                  <Question className="text-accent-secondary" size={20} />
                  Questions to ask maintainer
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                  {displayIssue.issueContext.questionsToAsk.length ? (
                    displayIssue.issueContext.questionsToAsk.map((question, index) => (
                      <li key={`${question}-${index}`} className="flex gap-2">
                        <ChatCircleText className="mt-0.5 shrink-0 text-accent-secondary" size={16} />
                        {question}
                      </li>
                    ))
                  ) : (
                    <li className="text-text-muted">No clarifying questions generated yet.</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="mt-10">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-3xl font-bold tracking-tight">Implementation Plan</h2>
                <MagneticLink href={`/api/v1/issues/${issue.id}/plan`} variant="ghost">API</MagneticLink>
              </div>
              {plan ? <PlanTimeline plan={plan} repoFullName={displayRepo.fullName} /> : explained ? <PlanGenerator issueId={displayIssue.id} /> : <div className="rounded-2xl border border-border-subtle bg-surface p-6 text-sm text-text-secondary">Explain the issue first to unlock the implementation planner.</div>}
            </div>
          </section>
          <aside className="space-y-5">
            <div className="rounded-2xl border border-border-subtle bg-surface p-6">
              <p className="font-mono text-xs uppercase tracking-wide text-text-muted">Repository</p>
              <h2 className="mt-2 font-display text-2xl font-bold">{displayRepo.fullName}</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{displayRepo.description}</p>
              <div className="mt-5 border-t border-border-subtle pt-5">
                <IssueActions issueId={displayIssue.id} initialSaved={displayIssue.saved} initialDismissed={displayIssue.dismissed} />
              </div>
              <MagneticLink href={displayIssue.githubUrl} variant="primary" className="mt-5" target="_blank">
                Open issue
                <ArrowSquareOut size={18} />
              </MagneticLink>
            </div>
            {plan ? <PRDraftCard plan={plan} githubUrl={displayIssue.githubUrl} /> : null}
          </aside>
        </div>
      </main>
    </>
  );
}
