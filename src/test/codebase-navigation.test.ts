import { describe, expect, it } from "vitest";
import { annotateLikelyFilesWithNavigationHints, capTreePathsForNavigation, skippedFileContentGotchas, validateLikelyFilesAgainstTree } from "@/lib/codebase-navigation";
import { createInitialState } from "@/lib/demo-data";

describe("codebase navigation", () => {
  it("keeps valid likely files and annotates validation", () => {
    const issue = {
      ...createInitialState().issues[0],
      likelyFiles: [{ path: "cmd/info.go", reason: "Issue mentions the info command." }],
      issueContext: { ...createInitialState().issues[0].issueContext, gotchas: [] }
    };

    const result = validateLikelyFilesAgainstTree(issue, ["cmd/info.go", "README.md"]);

    expect(result.likelyFiles).toEqual([
      {
        path: "cmd/info.go",
        reason: "Issue mentions the info command. Validated against GitHub tree."
      }
    ]);
    expect(result.issueContextPatch.stale).toBeUndefined();
  });

  it("filters missing files and marks stale issue context", () => {
    const issue = {
      ...createInitialState().issues[0],
      likelyFiles: [{ path: "cmd/missing.go", reason: "LLM suggested it." }]
    };

    const result = validateLikelyFilesAgainstTree(issue, ["cmd/info.go"]);

    expect(result.likelyFiles).toEqual([]);
    expect(result.issueContextPatch.stale).toBe(true);
    expect(result.issueContextPatch.gotchas).toContain("Suggested file cmd/missing.go was not found in the current repository tree.");
  });

  it("filters binary and generated file suggestions with contributor notes", () => {
    const issue = {
      ...createInitialState().issues[0],
      likelyFiles: [
        { path: "assets/logo.png", reason: "LLM suggested it." },
        { path: "dist/index.js", reason: "LLM suggested it." },
        { path: "src/index.ts", reason: "Source entrypoint." }
      ],
      issueContext: { ...createInitialState().issues[0].issueContext, gotchas: ["Existing gotcha"] }
    };

    const result = validateLikelyFilesAgainstTree(issue, ["assets/logo.png", "dist/index.js", "src/index.ts"]);

    expect(result.likelyFiles.map((file) => file.path)).toEqual(["src/index.ts"]);
    expect(result.issueContextPatch.gotchas).toContain("Existing gotcha");
    expect(result.issueContextPatch.gotchas).toContain("Agent suggested binary file assets/logo.png; review manually before editing.");
    expect(result.issueContextPatch.gotchas).toContain("Don't edit generated file dist/index.js; find the source file instead.");
  });

  it("caps tree paths at three levels unless likely files point deeper", () => {
    const paths = [
      "README.md",
      "src/app/page.tsx",
      "src/app/dashboard/widgets/deep.tsx",
      "packages/server/src/routes/issues.ts",
      "packages/server/src/routes/plans.ts"
    ];

    expect(capTreePathsForNavigation(paths, [{ path: "packages/server/src/routes/issues.ts" }])).toEqual([
      "README.md",
      "src/app/page.tsx",
      "packages/server/src/routes/issues.ts",
      "packages/server/src/routes/plans.ts"
    ]);
  });

  it("adds function-level navigation hints from fetched file content", () => {
    const issue = {
      ...createInitialState().issues[0],
      title: "Persist issue filters in dashboard",
      labels: ["bug"],
      likelyFiles: [{ path: "src/issues.ts", reason: "Owns issue filter persistence." }]
    };

    const files = annotateLikelyFilesWithNavigationHints(issue, [
      {
        path: "src/issues.ts",
        content: `import { saveFilters } from "./storage";\n\nexport function renderIssues() {}\n\nexport function persistIssueFilters() {}\n`
      }
    ]);

    expect(files[0]?.navigationHint).toEqual({
      section: "export function persistIssueFilters() {} (line 5)",
      reason: "Start near this section because Owns issue filter persistence.",
      dependencies: ["./storage"]
    });
  });

  it("surfaces skipped file content as contributor gotchas", () => {
    expect(
      skippedFileContentGotchas([
        { path: "large.log", skippedReason: "File large.log is larger than 1MB; inspect the GitHub blob manually." },
        { path: "src/app.ts", content: "export function app() {}" }
      ])
    ).toEqual(["File large.log is larger than 1MB; inspect the GitHub blob manually."]);
  });
});
