import { Badge } from "@/components/badge";
import { ProfileAnalyzeButton } from "@/components/profile-analyze-button";
import { SpotlightCard } from "@/components/spotlight-card";
import { StatCounter } from "@/components/stat-counter";
import { firstPublicRepoMessage, hasNoPublicRepoSignal } from "@/lib/profile-onboarding";
import type { SkillProfile } from "@/lib/types";

export function SkillCard({ profile }: { profile: SkillProfile }) {
  const emptyProfile = hasNoPublicRepoSignal(profile);

  return (
    <SpotlightCard className="p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Skill profile</p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Your contribution fingerprint</h2>
        </div>
        <Badge className="border-accent-primary/30 bg-accent-primary/10 text-text-primary">{profile.difficulty}</Badge>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border-subtle bg-base/40 p-4">
          <StatCounter value={profile.totalRepos} />
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-text-muted">Public repos</p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-base/40 p-4">
          <StatCounter value={profile.totalMergedPRs} />
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-text-muted">Merged PRs</p>
        </div>
      </div>
      {emptyProfile ? (
        <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-amber-200">Getting started</p>
          <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{firstPublicRepoMessage}</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Public repositories give the analysis agent language and project signals. Until then, ContribPath keeps you in Beginner mode and uses default contribution suggestions.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {profile.languages.map((language) => (
              <div key={language.name}>
                <div className="mb-1 flex justify-between font-mono text-xs uppercase tracking-wide text-text-secondary">
                  <span>{language.name}</span>
                  <span>{language.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.04]">
                  <div
                    className="h-full rounded-full bg-accent-primary shadow-glow"
                    style={{ width: `${language.percentage}%` }}
                    aria-label={`${language.name} ${language.percentage}%`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.frameworks.map((framework) => (
              <Badge key={framework}>{framework}</Badge>
            ))}
          </div>
        </>
      )}
      <ProfileAnalyzeButton analyzedAt={profile.analyzedAt} />
    </SpotlightCard>
  );
}
