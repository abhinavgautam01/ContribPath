import { describe, expect, it } from "vitest";
import { regeneratePrDraft } from "@/lib/agents";
import { createInitialState } from "@/lib/demo-data";
import { draftWatermark, formatPrDraftDescription } from "@/lib/pr-draft";
import type { ImplementationPlan } from "@/lib/types";

const baseDescription =
  "## Summary\n\nUpdates docs.\n\n## Changes\n\n- Documents plugin discovery\n\n## Testing\n\n- pnpm test\n\n## Related Issue\n\nCloses #52";

describe("PR draft formatting", () => {
  const state = createInitialState();
  const docsIssue = state.issues.find((issue) => issue.id === "issue_pytrail_docs")!;
  const bugIssue = state.issues.find((issue) => issue.id === "issue_notes_table")!;

  it("watermarks drafts until implementation is complete", () => {
    const description = formatPrDraftDescription(bugIssue, { prDescription: baseDescription });

    expect(description.startsWith(`> ${draftWatermark}`)).toBe(true);
    expect(description).toContain("## Testing");
  });

  it("omits testing and adds a preview placeholder for docs-only drafts", () => {
    const description = formatPrDraftDescription(docsIssue, { prDescription: baseDescription });

    expect(description).not.toContain("## Testing");
    expect(description).toContain("## Preview");
    expect(description).toContain("Add preview link or screenshots before opening the PR.");
    expect(description).toContain("## Related Issue");
  });

  it("honors includeTests false for non-docs drafts", () => {
    const description = formatPrDraftDescription(bugIssue, { prDescription: baseDescription }, { includeTests: false });

    expect(description).not.toContain("## Testing");
    expect(description).not.toContain("## Preview");
  });

  it("regenerates a draft without mutating the source plan", async () => {
    const plan: ImplementationPlan = {
      id: "plan_docs",
      issueId: docsIssue.id,
      steps: [],
      prTitle: "docs: document plugin discovery",
      prDescription: baseDescription,
      generatedAt: "2026-06-21T10:30:00.000Z"
    };

    const regenerated = await regeneratePrDraft(docsIssue, plan, { tone: "concise" });

    expect(regenerated.id).toBe("plan_docs");
    expect(regenerated.prDescription).toContain(`> ${draftWatermark}`);
    expect(regenerated.prDescription).toContain("## Preview");
    expect(plan.prDescription).toBe(baseDescription);
  });
});
