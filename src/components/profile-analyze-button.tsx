"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, SpinnerGap } from "@phosphor-icons/react";
import { JobStatusBar } from "@/components/job-status-bar";
import { MagneticButton } from "@/components/magnetic-button";
import { getProfileReanalysisState } from "@/lib/profile-analysis";

export function ProfileAnalyzeButton({ analyzedAt }: { analyzedAt: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "running" | "queued" | "done" | "failed">("idle");
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const reanalysis = useMemo(() => getProfileReanalysisState(analyzedAt), [analyzedAt]);
  const busy = status === "running" || isPending;
  const disabled = busy || status === "queued" || !reanalysis.canReanalyze;

  async function analyzeProfile() {
    setStatus("running");
    setError(null);
    try {
      const response = await fetch("/api/v1/profile/analyze", { method: "POST" });
      if (!response.ok) throw new Error("Profile analysis failed");
      const payload = (await response.json()) as { jobId?: string; status?: string };
      setJobId(payload.jobId);
      if (payload.status === "queued") {
        setStatus("queued");
        return;
      }
      setStatus("done");
      startTransition(() => router.refresh());
    } catch {
      setStatus("failed");
      setError("Could not start analysis.");
    }
  }

  return (
    <div className="mt-6 space-y-2" aria-live="polite">
      <MagneticButton type="button" variant="primary" onClick={analyzeProfile} disabled={disabled}>
        {busy ? <SpinnerGap className="animate-spin" size={18} /> : <ArrowsClockwise size={18} />}
        {status === "queued" ? "Queued" : busy ? "Analysing" : "Re-analyse"}
      </MagneticButton>
      {!reanalysis.canReanalyze ? (
        <p className="font-mono text-xs uppercase tracking-wide text-text-muted">Available in {reanalysis.waitMinutes} min</p>
      ) : null}
      {status === "queued" ? <p className="text-sm text-text-muted">Background analysis queued.</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <JobStatusBar jobId={jobId} />
    </div>
  );
}
