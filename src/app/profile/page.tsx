import { AppNav } from "@/components/app-nav";
import { ProfilePreferencesForm } from "@/components/profile-preferences-form";
import { SkillCard } from "@/components/skill-card";
import { getCurrentWorkspace } from "@/lib/workspace-data";

export default async function ProfilePage() {
  const { profile } = await getCurrentWorkspace();
  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Profile analysis</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Skill model</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <SkillCard profile={profile} />
          <ProfilePreferencesForm profile={profile} />
        </div>
      </main>
    </>
  );
}
