import { describe, expect, it } from "vitest";
import { sanitizeIssueForDisplay, sanitizePlanForDisplay, sanitizeRepoForDisplay } from "@/lib/display-sanitization";
import { createInitialState } from "@/lib/demo-data";

const { issues: demoIssues, plans: demoPlans, repos: demoRepos } = createInitialState();

describe("display sanitization", () => {
  it("strips HTML tags and control characters from issue display fields", () => {
    const issue = sanitizeIssueForDisplay({
      ...demoIssues[0],
      title: "<script>alert(1)</script> Missing notes\u0007",
      body: "<img src=x onerror=alert(1)>Body",
      labels: ["bug", "<b>security</b>", "<script></script>"],
      aiSummary: "Fix <a href='javascript:alert(1)'>notes</a>",
      likelyFiles: [{ path: "src/<b>notes</b>.ts", reason: "<em>Broken</em> query" }],
      issueContext: {
        ...demoIssues[0].issueContext,
        problem: "<strong>Problem</strong>",
        context: "<iframe src='x'></iframe>Trace path",
        gotchas: ["<img onerror=alert(1)>Escaped input", "<script></script>"],
        questionsToAsk: ["Can <b>maintainers</b> confirm?"]
      }
    });

    expect(issue.title).toBe("alert(1) Missing notes");
    expect(issue.body).toBe("Body");
    expect(issue.labels).toEqual(["bug", "security"]);
    expect(issue.aiSummary).toBe("Fix notes");
    expect(issue.likelyFiles[0]).toEqual({ path: "src/notes.ts", reason: "Broken query" });
    expect(issue.issueContext.problem).toBe("Problem");
    expect(issue.issueContext.context).toBe("Trace path");
    expect(issue.issueContext.gotchas).toEqual(["Escaped input"]);
    expect(issue.issueContext.questionsToAsk).toEqual(["Can maintainers confirm?"]);
  });

  it("strips HTML tags from repository display fields", () => {
    const repo = sanitizeRepoForDisplay({
      ...demoRepos[0],
      fullName: "owner/<script>repo</script>",
      description: "Package <img src=x onerror=alert(1)> manager",
      language: "<b>TypeScript</b>"
    });

    expect(repo.fullName).toBe("owner/repo");
    expect(repo.description).toBe("Package manager");
    expect(repo.language).toBe("TypeScript");
  });

  it("strips HTML from plan fields while preserving markdown text", () => {
    const plan = sanitizePlanForDisplay({
      ...demoPlans[demoIssues[0].id],
      prTitle: "Fix <script>alert(1)</script> notes",
      prDescription: "## Summary\n\nRemove <img src=x onerror=alert(1)> bad query",
      steps: [
        {
          step: 1,
          title: "<b>Trace</b> code",
          description: "Inspect <script>alert(1)</script> handler",
          files: ["src/<b>index</b>.ts", "<script></script>"],
          tips: ["Avoid <em>raw</em> HTML", "<script></script>"],
          command: "pnpm <b>test</b>"
        }
      ]
    });

    expect(plan.prTitle).toBe("Fix alert(1) notes");
    expect(plan.prDescription).toBe("## Summary Remove bad query");
    expect(plan.steps[0].title).toBe("Trace code");
    expect(plan.steps[0].description).toBe("Inspect alert(1) handler");
    expect(plan.steps[0].files).toEqual(["src/index.ts"]);
    expect(plan.steps[0].tips).toEqual(["Avoid raw HTML"]);
    expect(plan.steps[0].command).toBe("pnpm test");
  });
});
