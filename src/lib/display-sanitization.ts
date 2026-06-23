import { stripHtmlTags } from "@/lib/llm-sanitization";
import type { ImplementationPlan, Issue, IssueContext, PlanStep, Repository } from "@/lib/types";

const TAG_PATTERN = /<\/?[^>]+>/g;
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeDisplayText(value: string) {
  return stripHtmlTags(value);
}

function sanitizeDisplayToken(value: string) {
  return value.replace(TAG_PATTERN, "").replace(CONTROL_CHARS_PATTERN, "").replace(/\s+/g, " ").trim();
}

function sanitizeIssueContext(context: IssueContext): IssueContext {
  return {
    ...context,
    problem: sanitizeDisplayText(context.problem),
    context: sanitizeDisplayText(context.context),
    gotchas: context.gotchas.map(sanitizeDisplayText).filter(Boolean),
    questionsToAsk: context.questionsToAsk.map(sanitizeDisplayText).filter(Boolean)
  };
}

export function sanitizeIssueForDisplay(issue: Issue): Issue {
  return {
    ...issue,
    title: sanitizeDisplayText(issue.title),
    body: sanitizeDisplayText(issue.body),
    labels: issue.labels.map(sanitizeDisplayToken).filter(Boolean),
    aiSummary: sanitizeDisplayText(issue.aiSummary),
    likelyFiles: issue.likelyFiles.map((file) => ({
      path: sanitizeDisplayToken(file.path),
      reason: sanitizeDisplayText(file.reason)
    })),
    issueContext: sanitizeIssueContext(issue.issueContext)
  };
}

export function sanitizeRepoForDisplay(repo: Repository): Repository {
  return {
    ...repo,
    fullName: sanitizeDisplayToken(repo.fullName),
    description: sanitizeDisplayText(repo.description),
    language: sanitizeDisplayToken(repo.language)
  };
}

function sanitizePlanStep(step: PlanStep): PlanStep {
  return {
    ...step,
    title: sanitizeDisplayText(step.title),
    description: sanitizeDisplayText(step.description),
    files: step.files.map(sanitizeDisplayToken).filter(Boolean),
    tips: step.tips.map(sanitizeDisplayText).filter(Boolean),
    command: step.command ? sanitizeDisplayToken(step.command) : undefined
  };
}

export function sanitizePlanForDisplay(plan: ImplementationPlan): ImplementationPlan {
  return {
    ...plan,
    prTitle: sanitizeDisplayText(plan.prTitle),
    prDescription: sanitizeDisplayText(plan.prDescription),
    steps: plan.steps.map(sanitizePlanStep)
  };
}
