"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightning, SpinnerGap } from "@phosphor-icons/react";
import { JobStatusBar } from "@/components/job-status-bar";
import { MagneticButton } from "@/components/magnetic-button";

export function PlanGenerator({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "running" | "queued" | "done" | "failed">("idle");
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const handleComplete = useCallback(() => {
    setStatus("done");
    startTransition(() => router.refresh());
  }, [router, startTransition]);

  async function generatePlan() {
    setStatus("running");
    setError(null);

    try {
      const response = await fetch(`/api/v1/issues/${issueId}/plan`, { method: "POST" });
      if (!response.ok) throw new Error("Plan generation failed");
      const payload = (await response.json()) as { jobId?: string; status?: string };
      setJobId(payload.jobId);
      setStatus("queued");
    } catch {
      setStatus("failed");
      setError("Could not generate the plan.");
    }
  }

  const busy = status === "running" || isPending;

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6">
      <p className="font-mono text-xs uppercase tracking-wide text-accent-secondary">Implementation plan</p>
      <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">Generate the contributor checklist</h3>
      <p className="mt-3 text-sm leading-6 text-text-secondary">
        Build a step-by-step plan, likely file map, test commands, and a draft PR description for this issue.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <MagneticButton type="button" variant="primary" onClick={generatePlan} disabled={busy || status === "queued"}>
          {busy ? <SpinnerGap className="animate-spin" size={18} /> : <Lightning size={18} />}
          {status === "queued" ? "Queued" : busy ? "Generating" : "Generate plan"}
        </MagneticButton>
        {status === "queued" ? <span className="text-sm text-text-muted">Worker queue accepted the job.</span> : null}
        {error ? <span className="text-sm text-danger">{error}</span> : null}
      </div>
      <JobStatusBar jobId={jobId} onComplete={handleComplete} />
    </div>
  );
}
