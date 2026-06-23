"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FunnelSimple, X } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/magnetic-button";
import type { RepoFilters } from "@/lib/repo-filters";

export function RepoFilterBar({
  languages,
  filters,
  total,
  visible
}: {
  languages: string[];
  filters: RepoFilters;
  total: number;
  visible: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const activeFilters = Number(filters.language !== "all") + Number(filters.minScore > 0);

  function updateParams(patch: Partial<RepoFilters>) {
    const params = new URLSearchParams(searchParams.toString());
    const next = { ...filters, ...patch };
    params.delete("page");

    if (next.language !== "all") params.set("language", next.language);
    else params.delete("language");

    if (next.minScore > 0) params.set("min_score", String(next.minScore));
    else params.delete("min_score");

    startTransition(() => router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false }));
  }

  return (
    <section className="mb-6 rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-text-muted">Repository filters</p>
          <p className="mt-2 text-sm text-text-secondary">
            {visible.toLocaleString()} of {total.toLocaleString()} repositories{isPending ? " updating" : ""}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_160px_auto] sm:items-end">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Language</span>
            <select
              value={filters.language}
              onChange={(event) => updateParams({ language: event.target.value })}
              className="mt-2 w-full rounded-lg border border-border-subtle bg-base px-3 py-2.5 text-sm text-text-primary outline-none focus:border-border-hover focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="all">All</option>
              {languages.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Min score</span>
            <select
              value={String(filters.minScore)}
              onChange={(event) => updateParams({ minScore: Number(event.target.value) })}
              className="mt-2 w-full rounded-lg border border-border-subtle bg-base px-3 py-2.5 text-sm text-text-primary outline-none focus:border-border-hover focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="0">Any</option>
              <option value="40">40+</option>
              <option value="70">70+</option>
              <option value="90">90+</option>
            </select>
          </label>
          <MagneticButton
            type="button"
            variant="ghost"
            disabled={!activeFilters && !isPending}
            onClick={() => updateParams({ language: "all", minScore: 0 })}
          >
            {activeFilters ? <X size={17} /> : <FunnelSimple size={17} />}
            {activeFilters ? "Reset" : "Filters"}
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
