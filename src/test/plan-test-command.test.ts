import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/demo-data";
import { inferIssueLanguage, testCommandForIssue } from "@/lib/plan-test-command";

function issueWithFiles(paths: string[], repoId = "repo") {
  return {
    ...createInitialState().issues[0],
    repoId,
    likelyFiles: paths.map((path) => ({ path, reason: "test" }))
  };
}

describe("planner test commands", () => {
  it("uses Go test command for Go files", () => {
    const issue = issueWithFiles(["cmd/info.go"]);

    expect(inferIssueLanguage(issue)).toBe("go");
    expect(testCommandForIssue(issue)).toBe("go test ./...");
  });

  it("uses pytest for Python files", () => {
    expect(testCommandForIssue(issueWithFiles(["pytrail/plugins/discovery.py"]))).toBe("pytest");
  });

  it("uses cargo test for Rust files", () => {
    expect(testCommandForIssue(issueWithFiles(["crates/core/src/lib.rs"]))).toBe("cargo test");
  });

  it("defaults web and unknown files to pnpm test", () => {
    expect(testCommandForIssue(issueWithFiles(["src/app/page.tsx"]))).toBe("pnpm test");
    expect(testCommandForIssue(issueWithFiles(["README.md"]))).toBe("pnpm test");
  });
});
