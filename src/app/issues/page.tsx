import { AppNav } from "@/components/app-nav";
import { EmptyState } from "@/components/empty-state";
import { IssueFilterBar } from "@/components/issue-filter-bar";
import { IssueCard } from "@/components/issue-card";
import { IssueDiscoveryButton } from "@/components/issue-discovery-button";
import { getIssueEmptyState } from "@/lib/issue-empty-state";
import { defaultIssueFilters, issueMatchesFilters } from "@/lib/issue-filters";
import { getCurrentWorkspace } from "@/lib/workspace-data";

type SearchParams = {
  q?: string;
  difficulty?: string;
  language?: string;
  saved?: string;
  min_health?: string;
};

export default async function IssuesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const workspace = await getCurrentWorkspace();
  const filters = {
    ...defaultIssueFilters,
    q: resolvedSearchParams?.q?.trim() ?? defaultIssueFilters.q,
    difficulty: resolvedSearchParams?.difficulty ?? defaultIssueFilters.difficulty,
    language: resolvedSearchParams?.language ?? defaultIssueFilters.language,
    saved: resolvedSearchParams?.saved === "true",
    minHealth: Number(resolvedSearchParams?.min_health ?? defaultIssueFilters.minHealth)
  };
  const activeIssues = workspace.issues.filter((issue) => !issue.dismissed);
  const languages = Array.from(new Set(workspace.repos.map((repo) => repo.language).filter(Boolean))).sort();
  const issues = activeIssues.filter((issue) => {
    const repo = workspace.repos.find((candidate) => candidate.id === issue.repoId);
    return issueMatchesFilters(issue, repo, filters);
  });
  const emptyState = getIssueEmptyState(workspace.issues, issues, filters);

  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Issue explorer</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Ranked open-source matches</h1>
        </div>
        <IssueFilterBar languages={languages} filters={filters} total={activeIssues.length} visible={issues.length} />
        {issues.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {issues.map((issue) => {
              const repo = workspace.repos.find((candidate) => candidate.id === issue.repoId)!;
              return <IssueCard key={issue.id} issue={issue} repo={repo} />;
            })}
          </div>
        ) : (
          <EmptyState
            title={emptyState.title}
            body={emptyState.body}
            action={emptyState.showRefresh ? <div className="mt-6 flex justify-center"><IssueDiscoveryButton align="center" /></div> : undefined}
          />
        )}
      </main>
    </>
  );
}
