"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { JobStatusBar } from "@/components/job-status-bar";

export function ResumeJobStatus({ jobId }: { jobId?: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const refreshOnComplete = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router, startTransition]);

  return <JobStatusBar jobId={jobId ?? undefined} onComplete={refreshOnComplete} />;
}
