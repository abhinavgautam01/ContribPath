import type { ImplementationPlan, Issue } from "@/lib/types";

export type PrDraftOptions = {
  tone?: "concise" | "detailed";
  includeTests?: boolean;
  pullRequestTemplate?: string;
  conventionalCommits?: boolean;
};

export const draftWatermark = "⚠️ Draft — complete your implementation before using this.";
export const prTemplatePaths = [
  "PULL_REQUEST_TEMPLATE.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "docs/PULL_REQUEST_TEMPLATE.md"
];
export const conventionalCommitConfigPaths = [
  ".commitlintrc",
  ".commitlintrc.json",
  ".commitlintrc.yml",
  ".commitlintrc.yaml",
  "commitlint.config.js",
  "commitlint.config.cjs",
  "commitlint.config.mjs"
];

function removeSection(markdown: string, heading: string) {
  const pattern = new RegExp(`\\n?## ${heading}\\n[\\s\\S]*?(?=\\n## |$)`, "i");
  return markdown.replace(pattern, "").trim();
}

function insertSectionBeforeRelatedIssue(markdown: string, section: string) {
  const relatedIssue = "\n## Related Issue";
  if (markdown.includes(relatedIssue)) {
    return markdown.replace(relatedIssue, `\n${section}\n${relatedIssue}`);
  }
  return `${markdown.trim()}\n\n${section}`;
}

function sectionBody(markdown: string, heading: string) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.match(new RegExp(`## ${escapedHeading}\\n([\\s\\S]*?)(?=\\n## |$)`, "i"))?.[1]?.trim() ?? "";
}

function isPlaceholder(value: string) {
  const trimmed = value.trim();
  return !trimmed || /^<!--[\s\S]*-->$/.test(trimmed) || /^\[[\s\S]*\]$/.test(trimmed);
}

function sectionForTemplateHeading(heading: string, baseDescription: string, issue: Pick<Issue, "githubIssueNumber" | "issueContext">) {
  const normalized = heading.toLowerCase();
  if (normalized.includes("summary") || normalized.includes("description")) return sectionBody(baseDescription, "Summary");
  if (normalized.includes("change")) return sectionBody(baseDescription, "Changes");
  if (normalized.includes("test")) return issue.issueContext.type === "docs" ? "Docs-only change; add preview details below." : sectionBody(baseDescription, "Testing");
  if (normalized.includes("preview")) return "Add preview link or screenshots before opening the PR.";
  if (normalized.includes("related") || normalized.includes("issue")) return `Closes #${issue.githubIssueNumber}`;
  return "";
}

export function fillPullRequestTemplate(
  template: string,
  baseDescription: string,
  issue: Pick<Issue, "githubIssueNumber" | "issueContext">
) {
  const headingPattern = /^(## .+)$/gm;
  if (!headingPattern.test(template)) return baseDescription;

  return template.replace(/^(##\s+(.+))\n([\s\S]*?)(?=^##\s+|\s*$)/gm, (full, headingLine: string, heading: string, body: string) => {
    if (!isPlaceholder(body)) return full.trimEnd();
    const replacement = sectionForTemplateHeading(heading, baseDescription, issue);
    return `${headingLine}\n\n${replacement || body.trim()}`.trimEnd();
  });
}

function withDraftWatermark(markdown: string) {
  if (markdown.includes(draftWatermark)) return markdown;
  return `> ${draftWatermark}\n\n${markdown.trim()}`;
}

export function suggestedCommitMessage(issue: Pick<Issue, "title" | "issueContext">) {
  const type = issue.issueContext.type === "docs" ? "docs" : issue.issueContext.type === "feature" ? "feat" : "fix";
  const subject = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
  return `${type}: ${subject || "update contribution fix"}`;
}

export function formatPrDraftDescription(
  issue: Pick<Issue, "githubIssueNumber" | "issueContext" | "title">,
  plan: Pick<ImplementationPlan, "prDescription">,
  options: PrDraftOptions = {}
) {
  const includeTests = options.includeTests ?? true;
  let description = options.pullRequestTemplate
    ? fillPullRequestTemplate(options.pullRequestTemplate, plan.prDescription.trim(), issue)
    : plan.prDescription.trim();

  if (!includeTests || issue.issueContext.type === "docs") {
    description = removeSection(description, "Testing");
  }

  if (issue.issueContext.type === "docs" && !description.includes("## Preview")) {
    description = insertSectionBeforeRelatedIssue(description, "## Preview\n\n- Add preview link or screenshots before opening the PR.");
  }

  if (options.conventionalCommits && !description.includes("## Suggested Commit")) {
    description = insertSectionBeforeRelatedIssue(description, `## Suggested Commit\n\n\`${suggestedCommitMessage(issue)}\``);
  }

  if (options.tone === "concise") {
    description = description.replace(/\n{3,}/g, "\n\n");
  }

  return withDraftWatermark(description);
}
