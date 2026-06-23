import { ArrowRight, GitBranch, Sparkle, Timer } from "@phosphor-icons/react/dist/ssr";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/badge";
import { IssueCard } from "@/components/issue-card";
import { MagneticLink } from "@/components/magnetic-button";
import { SkillCard } from "@/components/skill-card";
import { getState } from "@/lib/store";

export default function HomePage() {
  const state = getState();
  const firstIssue = state.issues[0];
  const firstRepo = state.repos.find((repo) => repo.id === firstIssue.repoId)!;

  return (
    <>
      <AppNav />
      <main className="content-shell py-12 md:py-20">
        <section className="grid items-center gap-10 lg:grid-cols-[1fr_420px]">
          <div className="animate-fade-up">
            <Badge className="border-accent-secondary/25 bg-[var(--accent-secondary-bg)] text-accent-secondary">
              SPEC-driven MVP demo
            </Badge>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold tracking-tight text-text-primary md:text-7xl">
              From zero to first PR in under an hour.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
              ContribPath analyses your public GitHub footprint, ranks open-source issues by skill fit and maintainer
              health, then turns the selected issue into an implementation plan and PR draft.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <MagneticLink href="/dashboard" variant="primary">
                Open dashboard
                <ArrowRight size={18} />
              </MagneticLink>
              <MagneticLink href="/issues">Browse demo issues</MagneticLink>
            </div>
          </div>
          <div className="animate-fade-up rounded-2xl border border-border-subtle bg-surface p-6 shadow-glow [animation-delay:80ms]">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Skill fit", "94", GitBranch],
                ["Time saved", "4h", Timer],
                ["Plan ready", "7", Sparkle]
              ].map(([label, value, Icon]) => (
                <div key={label as string} className="rounded-2xl border border-border-subtle bg-base/50 p-4">
                  <Icon className="text-accent-primary" size={22} />
                  <div className="mt-4 font-mono text-2xl text-text-primary">{value as string}</div>
                  <div className="mt-1 font-mono text-[0.65rem] uppercase tracking-wide text-text-muted">{label as string}</div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <IssueCard issue={firstIssue} repo={firstRepo} />
            </div>
          </div>
        </section>
        <section className="mt-20 grid gap-6 lg:grid-cols-[420px_1fr]">
          <SkillCard profile={state.profile} />
          <div className="rounded-2xl border border-border-subtle bg-surface p-8">
            <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Agent pipeline</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {["Profile analysis", "Repository discovery", "Maintainer health", "Issue understanding", "Codebase navigation", "PR draft"].map(
                (item, index) => (
                  <div key={item} className="rounded-2xl border border-border-subtle bg-base/40 p-4">
                    <div className="font-display text-3xl font-bold text-text-muted/30">{String(index + 1).padStart(2, "0")}</div>
                    <div className="mt-3 font-medium text-text-primary">{item}</div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
