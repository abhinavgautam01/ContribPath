import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/badge";
import { isAdminRole } from "@/lib/auth/roles";
import { getAdminMetrics } from "@/lib/db/job-data";
import { getState } from "@/lib/store";

export default async function AdminPage() {
  const session = await auth();
  if (!isAdminRole(session?.user.role)) notFound();
  const state = getState();
  const metrics = await getAdminMetrics();
  const rows = metrics
    ? [
        ["Users", metrics.users],
        ["Repos", metrics.repos],
        ["Issues", metrics.issues],
        ["Jobs", metrics.jobs]
      ]
    : [
        ["Users", 1],
        ["Repos", state.repos.length],
        ["Issues", state.issues.length],
        ["Jobs", Object.keys(state.jobs).length]
      ];
  return (
    <>
      <AppNav />
      <main className="content-shell py-10">
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Internal</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Admin dashboard</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-border-subtle bg-surface p-6">
              <Badge>{label as string}</Badge>
              <div className="mt-5 font-mono text-4xl">{value as number}</div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
