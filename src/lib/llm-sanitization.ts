import type { Issue } from "@/lib/types";

const TAG_PATTERN = /<\/?[^>]+>/g;
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function stripHtmlTags(value: string) {
  return value.replace(TAG_PATTERN, " ").replace(CONTROL_CHARS_PATTERN, "").replace(/\s+/g, " ").trim();
}

function sanitizeList(values: string[]) {
  return values.map(stripHtmlTags).filter(Boolean);
}

export function sanitizeIssueForLlm(issue: Issue) {
  return {
    id: issue.id,
    repositoryIssueNumber: issue.githubIssueNumber,
    title: stripHtmlTags(issue.title),
    body: stripHtmlTags(issue.body),
    labels: sanitizeList(issue.labels),
    aiSummary: stripHtmlTags(issue.aiSummary),
    difficulty: issue.difficulty,
    timeEstimateMins: issue.timeEstimateMins,
    likelyFiles: issue.likelyFiles.map((file) => ({
      path: stripHtmlTags(file.path),
      reason: stripHtmlTags(file.reason)
    })),
    existingContext: {
      problem: stripHtmlTags(issue.issueContext.problem),
      context: stripHtmlTags(issue.issueContext.context),
      gotchas: sanitizeList(issue.issueContext.gotchas),
      questionsToAsk: sanitizeList(issue.issueContext.questionsToAsk),
      type: issue.issueContext.type
    }
  };
}

export function buildIssueContentBlock(issue: Issue) {
  return `<issue_content>${JSON.stringify(sanitizeIssueForLlm(issue))}</issue_content>`;
}
