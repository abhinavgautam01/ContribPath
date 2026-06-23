"use client";

import React from "react";
import { useEffect, useState } from "react";
import { CheckCircle, Sparkle, WarningCircle } from "@phosphor-icons/react";

type JobStatusMessage = {
  status: string;
  stage?: string;
  progress?: number;
  error?: string;
};

export function JobStatusBar({ jobId }: { jobId?: string }) {
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Agent pipeline running");

  useEffect(() => {
    if (!jobId) return undefined;
    setVisible(true);
    setToast(null);
    setProgress(0);
    setStage("Agent pipeline running");
    const source = new EventSource(`/api/v1/jobs/${jobId}/status`);
    const onStatus = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as JobStatusMessage;
      setStage(payload.stage ?? "Agent pipeline running");
      setProgress(typeof payload.progress === "number" ? payload.progress : 0);
    };
    const onComplete = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as JobStatusMessage;
      const message = payload.stage ?? "Agent pipeline complete";
      setStage(message);
      setProgress(1);
      window.setTimeout(() => {
        setVisible(false);
        setToast({ kind: "success", message });
      }, 1600);
      source.close();
    };
    const onError = (event: MessageEvent) => {
      const payload = JSON.parse(event.data) as JobStatusMessage;
      const message = payload.error ?? "Agent pipeline failed";
      setStage(message);
      setProgress(1);
      window.setTimeout(() => {
        setVisible(false);
        setToast({ kind: "error", message });
      }, 2400);
      source.close();
    };
    source.addEventListener("status", onStatus);
    source.addEventListener("complete", onComplete);
    source.addEventListener("error", onError);
    return () => {
      source.close();
    };
  }, [jobId]);

  return (
    <>
      {visible ? (
        <div
          className="fixed bottom-4 left-1/2 z-50 w-[min(680px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-border-subtle bg-surface/90 p-4 shadow-glow backdrop-blur-md"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 text-text-primary">
              <Sparkle className="text-accent-primary" weight="fill" />
              {stage}
            </span>
            <span className="font-mono text-xs uppercase tracking-wide text-text-muted">{Math.round(progress * 100)}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.04]">
            <div className="h-full rounded-full bg-accent-primary shadow-[0_0_14px_var(--accent-primary)] transition-all" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      ) : null}
      {toast ? (
        <div
          className="fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-32px))] items-start gap-3 rounded-xl border border-border-subtle bg-surface-elevated p-4 text-sm shadow-glow"
          role="status"
        >
          {toast.kind === "success" ? <CheckCircle className="mt-0.5 shrink-0 text-emerald-200" size={18} /> : <WarningCircle className="mt-0.5 shrink-0 text-rose-200" size={18} />}
          <span className="text-text-primary">{toast.message}</span>
        </div>
      ) : null}
    </>
  );
}
