"use client";

import React, { useState } from "react";
import { ArrowSquareOut, TerminalWindow } from "@phosphor-icons/react";
import { sanitizePlanForDisplay } from "@/lib/display-sanitization";
import { buildGitHubBlobUrl } from "@/lib/github-url";
import type { ImplementationPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlanTimeline({ plan, repoFullName }: { plan: ImplementationPlan; repoFullName?: string }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const displayPlan = sanitizePlanForDisplay(plan);

  return (
    <section className="space-y-5">
      {displayPlan.steps.map((step, index) => {
        const complete = done[step.step];
        return (
          <div
            key={step.step}
            className="animate-fade-up rounded-2xl border border-border-subtle bg-surface p-6"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex gap-5">
              <button
                type="button"
                onClick={() => setDone((current) => ({ ...current, [step.step]: !current[step.step] }))}
                className={cn(
                  "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-base transition",
                  complete ? "border-accent-primary bg-accent-primary text-base" : "border-text-muted text-transparent"
                )}
                aria-label={`Mark step ${step.step} ${complete ? "incomplete" : "complete"}`}
                aria-pressed={Boolean(complete)}
              >
                <svg className="plan-checkmark h-4 w-4" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.25 8.25 6.5 11.5l6.25-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="font-display text-5xl font-bold leading-none text-text-muted/30">{String(step.step).padStart(2, "0")}</div>
              <div className={cn("min-w-0 flex-1 transition", complete && "opacity-50")}>
                <h3 className={cn("font-display text-xl font-bold tracking-tight", complete && "line-through decoration-text-muted")}>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{step.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {step.files.map((file, fileIndex) => {
                    const href = repoFullName ? buildGitHubBlobUrl(repoFullName, file) : null;
                    return href ? (
                      <a key={`${file}-${fileIndex}`} href={href} target="_blank" rel="noreferrer" className="code-pointer inline-flex items-center gap-1" title="Open in GitHub">
                        {file}
                        <ArrowSquareOut size={13} />
                      </a>
                    ) : (
                      <span key={`${file}-${fileIndex}`} className="code-pointer">
                        {file}
                      </span>
                    );
                  })}
                </div>
                {step.tips.length ? (
                  <details className="mt-4 rounded-lg border border-border-subtle bg-base/50 p-3 text-sm text-text-secondary">
                    <summary className="cursor-pointer font-medium text-text-primary">Tips</summary>
                    <ul className="mt-2 space-y-1">
                      {step.tips.map((tip, tipIndex) => (
                        <li key={`${tip}-${tipIndex}`}>{tip}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {step.command ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-base/70 px-3 py-2 font-mono text-xs text-accent-secondary">
                    <TerminalWindow size={16} />
                    {step.command}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
