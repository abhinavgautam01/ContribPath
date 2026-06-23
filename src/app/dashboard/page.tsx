import { AppNav } from "@/components/app-nav";
import { IssueDiscoveryButton } from "@/components/issue-discovery-button";
import { IssueCard } from "@/components/issue-card";
import { MagneticLink } from "@/components/magnetic-button";
import { SkillCard } from "@/components/skill-card";
import { getCurrentWorkspace } from "@/lib/workspace-data";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();
  const recommended = workspace.issues.filter((issue) => !issue.dismissed).slice(0, 2);

  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Welcome back, {workspace.user.githubLogin}</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Recommended contribution path</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <MagneticLink href="/issues">Explore all issues</MagneticLink>
            <IssueDiscoveryButton />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <SkillCard profile={workspace.profile} />
          <section className="space-y-4">
            {recommended.map((issue) => {
              const repo = workspace.repos.find((candidate) => candidate.id === issue.repoId)!;
              return <IssueCard key={issue.id} issue={issue} repo={repo} />;
            })}
          </section>
        </div>
      </main>
    </>
  );
}
