import { AppNav } from "@/components/app-nav";
import { EmptyState } from "@/components/empty-state";
import { HealthBadge } from "@/components/health-badge";
import { IssueDiscoveryButton } from "@/components/issue-discovery-button";
import { RepoFilterBar } from "@/components/repo-filter-bar";
import { SpotlightCard } from "@/components/spotlight-card";
import { sanitizeRepoForDisplay } from "@/lib/display-sanitization";
import { parsePositiveInteger } from "@/lib/pagination";
import { getRepoEmptyState } from "@/lib/repo-empty-state";
import { defaultRepoFilters, repoMatchesFilters } from "@/lib/repo-filters";
import { getCurrentWorkspace } from "@/lib/workspace-data";

type SearchParams = {
  language?: string;
  min_score?: string;
};

export default async function ReposPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const { repos } = await getCurrentWorkspace();
  const filters = {
    ...defaultRepoFilters,
    language: resolvedSearchParams?.language ?? defaultRepoFilters.language,
    minScore: parsePositiveInteger(resolvedSearchParams?.min_score ?? null, defaultRepoFilters.minScore)
  };
  const languages = Array.from(new Set(repos.map((repo) => repo.language).filter(Boolean))).sort();
  const filteredRepos = repos.filter((repo) => repoMatchesFilters(repo, filters));
  const emptyState = getRepoEmptyState(repos, filteredRepos, filters);
  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Repository discovery</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Maintainer health scores</h1>
        </div>
        <RepoFilterBar languages={languages} filters={filters} total={repos.length} visible={filteredRepos.length} />
        {filteredRepos.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredRepos.map((repo) => {
              const displayRepo = sanitizeRepoForDisplay(repo);
              return (
                <SpotlightCard key={repo.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight">{displayRepo.fullName}</h2>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{displayRepo.description}</p>
                    </div>
                    <HealthBadge score={displayRepo.healthScore} breakdown={displayRepo.healthBreakdown} />
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-border-subtle bg-base/50 p-3">
                      <div className="font-mono text-lg">{displayRepo.stars.toLocaleString()}</div>
                      <div className="font-mono text-[0.62rem] uppercase tracking-wide text-text-muted">Stars</div>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-base/50 p-3">
                      <div className="font-mono text-lg">{displayRepo.skillMatchScore}</div>
                      <div className="font-mono text-[0.62rem] uppercase tracking-wide text-text-muted">Skill</div>
                    </div>
                    <div className="rounded-lg border border-border-subtle bg-base/50 p-3">
                      <div className="font-mono text-lg">{displayRepo.finalScore}</div>
                      <div className="font-mono text-[0.62rem] uppercase tracking-wide text-text-muted">Final</div>
                    </div>
                  </div>
                </SpotlightCard>
              );
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
