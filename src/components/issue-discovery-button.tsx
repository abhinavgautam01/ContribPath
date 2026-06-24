"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";
import { MagneticButton } from "@/components/magnetic-button";
import { JobStatusBar } from "@/components/job-status-bar";

export function IssueDiscoveryButton({ align = "end" }: { align?: "start" | "center" | "end" }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [jobId, setJobId] = useState<string>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const handleComplete = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router, startTransition]);

  async function refreshSuggestions() {
    setIsPending(true);
    setError("");
    const response = await fetch("/api/v1/issues/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: true })
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.detail ?? body?.error ?? "Could not refresh suggestions.");
      setIsPending(false);
      return;
    }

    setJobId(body.jobId);
    setIsPending(false);
  }

  const alignmentClass = align === "center" ? "items-center" : align === "start" ? "items-start" : "items-start sm:items-end";
  const errorAlignmentClass = align === "center" ? "text-center" : align === "end" ? "text-left sm:text-right" : "text-left";

  return (
    <div className={`flex flex-col gap-2 ${alignmentClass}`}>
      <MagneticButton type="button" variant="primary" onClick={refreshSuggestions} disabled={isPending}>
        {isPending ? <ArrowsClockwise size={17} className="animate-spin" /> : <ArrowsClockwise size={17} />}
        {isPending ? "Refreshing" : "Refresh suggestions"}
      </MagneticButton>
      {error ? (
        <p className={`flex max-w-xs items-center gap-2 text-xs leading-5 text-rose-200 ${errorAlignmentClass}`}>
          <WarningCircle size={15} className="shrink-0" />
          {error}
        </p>
      ) : null}
      <JobStatusBar jobId={jobId} onComplete={handleComplete} />
    </div>
  );
}
