import { testCommandForIssue } from "@/lib/plan-test-command";
import type { ImplementationPlan, Issue, PlanStep } from "@/lib/types";

const protocolTerms = ["grpc", "websocket", "web socket", "protobuf", "graphql", "oauth", "saml", "openid"];
const schemaTerms = ["schema", "migration", "database", "sql", "postgres", "mysql", "sqlite", "prisma", "drizzle"];

function issueText(issue: Issue) {
  return [issue.title, issue.body, issue.aiSummary, issue.labels.join(" "), issue.issueContext.problem, issue.issueContext.context, issue.issueContext.gotchas.join(" ")]
    .join(" ")
    .toLowerCase();
}

export function hasComplexProtocol(issue: Issue) {
  const text = issueText(issue);
  return protocolTerms.some((term) => text.includes(term));
}

export function hasSchemaChange(issue: Issue) {
  const text = issueText(issue);
  return schemaTerms.some((term) => text.includes(term));
}

export function localRunCommandForIssue(issue: Pick<Issue, "likelyFiles" | "repoId">) {
  const paths = issue.likelyFiles.map((file) => file.path.toLowerCase());
  if (paths.some((path) => path.endsWith(".go")) || issue.repoId.toLowerCase().includes("go")) return "go run ./...";
  if (paths.some((path) => path.endsWith(".py")) || issue.repoId.toLowerCase().includes("py")) return "python -m pytest -q";
  if (paths.some((path) => path.endsWith(".rs")) || issue.repoId.toLowerCase().includes("rust")) return "cargo run";
  return "pnpm dev";
}

function navigationTips(issue: Issue) {
  return issue.likelyFiles
    .map((file) => file.navigationHint && `Start in ${file.path} near ${file.navigationHint.section}.`)
    .filter((tip): tip is string => Boolean(tip))
    .slice(0, 3);
}

function plannerWarnings(issue: Issue) {
  const warnings: string[] = [];
  if (hasSchemaChange(issue)) warnings.push("Schema change - coordinate with maintainers before proceeding.");
  if (issue.likelyFiles.length >= 8) warnings.push("Complex issue - may exceed time estimate significantly.");
  return warnings;
}

export function buildImplementationPlanFromIssue(issue: Issue): ImplementationPlan {
  const files = issue.likelyFiles.map((file) => file.path);
  const primaryFile = files[0] ?? "README.md";
  const steps: PlanStep[] = [
    {
      step: 1,
      title: "Confirm the issue locally",
      description: `Read #${issue.githubIssueNumber}, confirm the expected behaviour, and collect a minimal reproduction before editing code.`,
      files: [primaryFile],
      tips: issue.issueContext.questionsToAsk.length ? issue.issueContext.questionsToAsk : ["Ask a maintainer if the acceptance criteria are unclear."]
    }
  ];

  if (hasComplexProtocol(issue)) {
    steps.push({
      step: steps.length + 1,
      title: "Read the protocol background",
      description: "Review the protocol or integration flow touched by this issue before changing implementation code.",
      files,
      tips: ["Check contribution docs, architecture notes, and existing integration tests for expected protocol behaviour."]
    });
  }

  steps.push(
    {
      step: steps.length + 1,
      title: "Make the focused change",
      description: `Update ${primaryFile} and related files with the smallest maintainable fix.`,
      files,
      tips: [...navigationTips(issue), ...plannerWarnings(issue), ...issue.issueContext.gotchas].slice(0, 6)
    },
    {
      step: steps.length + 2,
      title: "Run the project locally",
      description: "Start the closest local app, CLI, or package command and verify the changed behavior manually.",
      files,
      command: localRunCommandForIssue(issue),
      tips: ["Capture any local setup notes needed for the PR or maintainer follow-up."]
    },
    {
      step: steps.length + 3,
      title: "Run the closest tests",
      description: "Run the project-specific test command and include the result in the PR.",
      files,
      command: testCommandForIssue(issue),
      tips: ["If no test suite is available, ask whether maintainers accept manual verification for this issue."]
    }
  );

  return {
    id: `plan_${issue.id}`,
    issueId: issue.id,
    steps,
    prTitle: `${issue.issueContext.type === "docs" ? "docs" : "fix"}: ${issue.title.toLowerCase()}`,
    prDescription: `## Summary\n\n${issue.aiSummary}\n\n## Changes\n\n- Updates ${primaryFile}\n- Follows the generated implementation plan\n\n## Testing\n\n- ${testCommandForIssue(issue)}\n\n## Related Issue\n\nCloses #${issue.githubIssueNumber}`,
    generatedAt: new Date().toISOString()
  };
}
