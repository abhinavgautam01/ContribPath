"use client";

import { useCallback, useState, useTransition } from "react";
import { Brain, SpinnerGap } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { JobStatusBar } from "@/components/job-status-bar";
import { MagneticButton } from "@/components/magnetic-button";

export function IssueExplanationButton({ issueId }: { issueId: string }) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [isPending, setIsPending] = useState(false);
  const [jobId, setJobId] = useState<string>();
  const [error, setError] = useState("");
  const handleComplete = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router, startTransition]);

  async function explainIssue() {
    setIsPending(true);
    setError("");
    const response = await fetch(`/api/v1/issues/${issueId}/explain`, { method: "POST" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.detail ?? body?.error ?? "Could not explain this issue.");
      setIsPending(false);
      return;
    }
    setJobId(body.jobId);
    setIsPending(false);
  }

  const busy = isPending || isRefreshing;

  return (
    <div className="flex flex-col items-start gap-2">
      <MagneticButton type="button" variant="primary" onClick={explainIssue} disabled={busy}>
        {busy ? <SpinnerGap size={17} className="animate-spin" /> : <Brain size={17} />}
        {busy ? "Explaining" : "Explain issue"}
      </MagneticButton>
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      <JobStatusBar jobId={jobId} onComplete={handleComplete} />
    </div>
  );
}
