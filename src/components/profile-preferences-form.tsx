"use client";

import { useState } from "react";
import { FloppyDisk, SlidersHorizontal } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { difficultyOptions, normalizeFrameworks } from "@/lib/profile-preferences";
import type { Difficulty, SkillProfile } from "@/lib/types";

export function ProfilePreferencesForm({ profile }: { profile: SkillProfile }) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>(profile.difficulty);
  const [preferredDomain, setPreferredDomain] = useState(profile.preferredDomain ?? "");
  const [frameworks, setFrameworks] = useState(profile.frameworks.join(", "));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function savePreferences() {
    setSaving(true);
    setStatus("idle");
    setError("");

    const response = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        difficulty,
        preferredDomain,
        frameworks: normalizeFrameworks(frameworks)
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.detail ?? body?.error ?? "Preferences could not be saved.");
      setStatus("error");
      setSaving(false);
      return;
    }

    const nextProfile = (await response.json()) as SkillProfile;
    setDifficulty(nextProfile.difficulty);
    setPreferredDomain(nextProfile.preferredDomain ?? "");
    setFrameworks(nextProfile.frameworks.join(", "));
    setStatus("saved");
    setSaving(false);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Profile preferences</p>
          <h2 className="mt-2 font-display text-2xl font-bold">Contribution fit</h2>
        </div>
        {status === "saved" ? <Badge className="border-emerald-300/25 bg-emerald-300/5 text-emerald-200">Saved</Badge> : null}
        {status === "error" ? <Badge className="border-rose-300/25 bg-rose-300/5 text-rose-200">Needs attention</Badge> : null}
      </div>

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Difficulty</span>
          <select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            className="h-12 rounded-lg border border-border-subtle bg-base px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary"
          >
            {difficultyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Preferred domain</span>
          <input
            value={preferredDomain}
            onChange={(event) => setPreferredDomain(event.target.value)}
            placeholder="Developer Tools"
            className="h-12 rounded-lg border border-border-subtle bg-base px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary"
          />
        </label>

        <label className="grid gap-2">
          <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Frameworks</span>
          <input
            value={frameworks}
            onChange={(event) => setFrameworks(event.target.value)}
            placeholder="React, Next.js, Node.js"
            className="h-12 rounded-lg border border-border-subtle bg-base px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-200">{error}</p> : null}

      <button
        type="button"
        onClick={savePreferences}
        disabled={saving}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-semibold text-white transition hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? <SlidersHorizontal size={17} className="animate-pulse" /> : <FloppyDisk size={17} />}
        {saving ? "Saving" : "Save preferences"}
      </button>
    </section>
  );
}
