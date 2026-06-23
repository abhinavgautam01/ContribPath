import { describe, expect, it } from "vitest";
import { buildImplementationPlanFromIssue, hasComplexProtocol, hasSchemaChange, localRunCommandForIssue } from "@/lib/implementation-plan";
import { createInitialState } from "@/lib/demo-data";

function demoIssue() {
  return createInitialState().issues[0];
}

describe("implementation plan generation", () => {
  it("includes explicit local run and test steps", () => {
    const issue = demoIssue();
    const plan = buildImplementationPlanFromIssue(issue);

    expect(plan.steps.map((step) => step.title)).toContain("Run the project locally");
    expect(plan.steps.map((step) => step.title)).toContain("Run the closest tests");
    expect(plan.steps.find((step) => step.title === "Run the closest tests")?.command).toBe("go test ./...");
  });

  it("uses language-aware local run commands", () => {
    expect(localRunCommandForIssue({ repoId: "go_repo", likelyFiles: [{ path: "cmd/root.go", reason: "entrypoint" }] })).toBe("go run ./...");
    expect(localRunCommandForIssue({ repoId: "python_repo", likelyFiles: [{ path: "src/app.py", reason: "entrypoint" }] })).toBe("python -m pytest -q");
    expect(localRunCommandForIssue({ repoId: "rust_repo", likelyFiles: [{ path: "src/lib.rs", reason: "entrypoint" }] })).toBe("cargo run");
    expect(localRunCommandForIssue({ repoId: "web_repo", likelyFiles: [{ path: "src/app/page.tsx", reason: "entrypoint" }] })).toBe("pnpm dev");
  });

  it("adds background reading for complex protocol issues", () => {
    const issue = {
      ...demoIssue(),
      title: "WebSocket reconnect drops auth state",
      body: "The websocket client loses OAuth state after reconnect."
    };
    const plan = buildImplementationPlanFromIssue(issue);

    expect(hasComplexProtocol(issue)).toBe(true);
    expect(plan.steps.map((step) => step.title)).toContain("Read the protocol background");
  });

  it("flags schema changes and cross-cutting issues in implementation tips", () => {
    const issue = {
      ...demoIssue(),
      title: "Add database migration for notes schema",
      likelyFiles: Array.from({ length: 8 }, (_, index) => ({
        path: `src/file-${index}.ts`,
        reason: "Touched by migration."
      }))
    };
    const plan = buildImplementationPlanFromIssue(issue);
    const implementationTips = plan.steps.find((step) => step.title === "Make the focused change")?.tips ?? [];

    expect(hasSchemaChange(issue)).toBe(true);
    expect(implementationTips).toContain("Schema change - coordinate with maintainers before proceeding.");
    expect(implementationTips).toContain("Complex issue - may exceed time estimate significantly.");
  });

  it("includes codebase navigation hints in implementation tips", () => {
    const issue = {
      ...demoIssue(),
      likelyFiles: [
        {
          path: "src/issues.ts",
          reason: "Owns issue persistence.",
          navigationHint: {
            section: "export function saveIssue() (line 42)",
            reason: "Start near persistence.",
            dependencies: ["./db"]
          }
        }
      ]
    };
    const plan = buildImplementationPlanFromIssue(issue);

    expect(plan.steps.find((step) => step.title === "Make the focused change")?.tips).toContain(
      "Start in src/issues.ts near export function saveIssue() (line 42)."
    );
  });
});
