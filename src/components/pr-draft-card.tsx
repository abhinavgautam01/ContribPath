"use client";

import { useState } from "react";
import { ArrowSquareOut, Check, Copy, GitPullRequest } from "@phosphor-icons/react";
import { MagneticButton, MagneticLink } from "@/components/magnetic-button";
import { sanitizePlanForDisplay } from "@/lib/display-sanitization";
import type { ImplementationPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PRDraftCard({ plan, githubUrl }: { plan: ImplementationPlan; githubUrl: string }) {
  const [copied, setCopied] = useState(false);
  const displayPlan = sanitizePlanForDisplay(plan);
  const text = `${displayPlan.prTitle}\n\n${displayPlan.prDescription}`;

  async function copyDraft() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section
      className={cn(
        "rounded-2xl border bg-[#06060a] p-5 transition",
        copied ? "border-emerald-300/40 shadow-[0_0_24px_rgba(74,222,128,0.14)]" : "border-border-subtle"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-text-secondary">
          <GitPullRequest className="text-accent-primary" size={18} />
          PR draft
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <MagneticLink href={githubUrl} variant="ghost" target="_blank">
            Open issue
            <ArrowSquareOut size={18} />
          </MagneticLink>
          <MagneticButton onClick={copyDraft} variant="primary">
            {copied ? <Check size={18} className="text-emerald-200" /> : <Copy size={18} />}
            {copied ? "Copied" : "Copy"}
          </MagneticButton>
        </div>
      </div>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-base/80 p-4 font-mono text-xs leading-6 text-text-secondary">
        <span className="text-text-primary">{displayPlan.prTitle}</span>
        {"\n\n"}
        {displayPlan.prDescription}
      </pre>
      <p className="mt-4 text-xs text-text-muted">Review this draft before submitting. AI-generated text may need editing.</p>
    </section>
  );
}
