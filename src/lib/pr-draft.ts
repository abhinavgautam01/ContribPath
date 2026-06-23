import type { ImplementationPlan, Issue } from "@/lib/types";

export type PrDraftOptions = {
  tone?: "concise" | "detailed";
  includeTests?: boolean;
};

export const draftWatermark = "⚠️ Draft — complete your implementation before using this.";

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

function withDraftWatermark(markdown: string) {
  if (markdown.includes(draftWatermark)) return markdown;
  return `> ${draftWatermark}\n\n${markdown.trim()}`;
}

export function formatPrDraftDescription(issue: Pick<Issue, "issueContext">, plan: Pick<ImplementationPlan, "prDescription">, options: PrDraftOptions = {}) {
  const includeTests = options.includeTests ?? true;
  let description = plan.prDescription.trim();

  if (!includeTests || issue.issueContext.type === "docs") {
    description = removeSection(description, "Testing");
  }

  if (issue.issueContext.type === "docs" && !description.includes("## Preview")) {
    description = insertSectionBeforeRelatedIssue(description, "## Preview\n\n- Add preview link or screenshots before opening the PR.");
  }

  if (options.tone === "concise") {
    description = description.replace(/\n{3,}/g, "\n\n");
  }

  return withDraftWatermark(description);
}
