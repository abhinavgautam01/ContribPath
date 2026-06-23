"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/magnetic-button";

type Filters = {
  q: string;
  difficulty: string;
  language: string;
  saved: boolean;
  minHealth: number;
};

export function IssueFilterBar({
  languages,
  filters,
  total,
  visible
}: {
  languages: string[];
  filters: Filters;
  total: number;
  visible: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);

  const activeFilters = useMemo(() => {
    return Number(Boolean(filters.q)) + Number(filters.difficulty !== "all") + Number(filters.language !== "all") + Number(filters.saved) + Number(filters.minHealth > 0);
  }, [filters]);

  function updateParams(patch: Partial<Filters>) {
    const params = new URLSearchParams(searchParams.toString());
    const next = { ...filters, ...patch };

    if (next.q) params.set("q", next.q);
    else params.delete("q");

    if (next.difficulty && next.difficulty !== "all") params.set("difficulty", next.difficulty);
    else params.delete("difficulty");

    if (next.language && next.language !== "all") params.set("language", next.language);
    else params.delete("language");

    if (next.saved) params.set("saved", "true");
    else params.delete("saved");

    if (next.minHealth > 0) params.set("min_health", String(next.minHealth));
    else params.delete("min_health");

    startTransition(() => router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false }));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateParams({ q: query.trim() });
  }

  return (
    <section className="mb-6 rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form onSubmit={submitSearch} className="min-w-0 flex-1">
          <label className="font-mono text-xs uppercase tracking-wide text-text-muted" htmlFor="issue-search">
            Search
          </label>
          <div className="mt-2 flex rounded-lg border border-border-subtle bg-base/70 focus-within:border-border-hover focus-within:ring-2 focus-within:ring-accent-primary/20">
            <span className="flex w-10 items-center justify-center text-text-muted">
              <MagnifyingGlass size={18} />
            </span>
            <input
              id="issue-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Repo, label, title, or AI summary"
              className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[150px_150px_150px_auto_auto] lg:items-end">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Difficulty</span>
            <select
              value={filters.difficulty}
              onChange={(event) => updateParams({ difficulty: event.target.value })}
              className="mt-2 w-full rounded-lg border border-border-subtle bg-base px-3 py-2.5 text-sm text-text-primary outline-none focus:border-border-hover focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="all">All</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </label>
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
            <span className="font-mono text-xs uppercase tracking-wide text-text-muted">Min health</span>
            <select
              value={String(filters.minHealth)}
              onChange={(event) => updateParams({ minHealth: Number(event.target.value) })}
              className="mt-2 w-full rounded-lg border border-border-subtle bg-base px-3 py-2.5 text-sm text-text-primary outline-none focus:border-border-hover focus:ring-2 focus:ring-accent-primary/20"
            >
              <option value="0">Any</option>
              <option value="40">40+</option>
              <option value="70">70+</option>
              <option value="90">90+</option>
            </select>
          </label>
          <label className="flex h-[42px] items-center gap-2 rounded-lg border border-border-subtle bg-base px-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={filters.saved}
              onChange={(event) => updateParams({ saved: event.target.checked })}
              className="h-4 w-4 accent-accent-primary"
            />
            Saved only
          </label>
          <MagneticButton type="button" variant="ghost" disabled={!activeFilters && !isPending} onClick={() => {
            setQuery("");
            updateParams({ q: "", difficulty: "all", language: "all", saved: false, minHealth: 0 });
          }}>
            {activeFilters ? <X size={17} /> : <FunnelSimple size={17} />}
            {activeFilters ? "Reset" : "Filters"}
          </MagneticButton>
        </div>
      </div>
      <p className="mt-4 font-mono text-xs uppercase tracking-wide text-text-muted">
        {visible.toLocaleString()} of {total.toLocaleString()} active matches{isPending ? " updating" : ""}
      </p>
    </section>
  );
}
