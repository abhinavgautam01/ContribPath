import { AppNav } from "@/components/app-nav";
import { EmptyState } from "@/components/empty-state";
import { IssueCard } from "@/components/issue-card";
import { MagneticLink } from "@/components/magnetic-button";
import { SavedBulkActions } from "@/components/saved-bulk-actions";
import { getSavedIssuesPage } from "@/lib/saved-issues";
import { getCurrentWorkspace } from "@/lib/workspace-data";

type SearchParams = {
  page?: string;
};

export default async function SavedPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const workspace = await getCurrentWorkspace();
  const savedPage = getSavedIssuesPage(workspace.issues, Number(resolvedSearchParams?.page ?? "1"));
  const saved = savedPage.items;
  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Saved queue</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Issues you marked for later</h1>
            <p className="mt-3 text-sm text-text-secondary">
              {savedPage.pagination.total} saved issue{savedPage.pagination.total === 1 ? "" : "s"}.
            </p>
          </div>
          {savedPage.pagination.total ? <SavedBulkActions visibleIds={saved.map((issue) => issue.id)} allIds={savedPage.allIds} /> : null}
        </div>
        {saved.length ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {saved.map((issue) => {
                const repo = workspace.repos.find((candidate) => candidate.id === issue.repoId)!;
                return <IssueCard key={issue.id} issue={issue} repo={repo} />;
              })}
            </div>
            {savedPage.pagination.totalPages > 1 ? (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-4">
                <span className="font-mono text-xs uppercase tracking-wide text-text-muted">
                  Page {savedPage.pagination.page} of {savedPage.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <MagneticLink href={`/saved?page=${Math.max(1, savedPage.pagination.page - 1)}`} variant="ghost">
                    Previous
                  </MagneticLink>
                  <MagneticLink href={`/saved?page=${Math.min(savedPage.pagination.totalPages, savedPage.pagination.page + 1)}`} variant="ghost">
                    Next
                  </MagneticLink>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState title="No saved issues yet" body="Save promising matches from the issue explorer to keep a focused queue." />
        )}
      </main>
    </>
  );
}
