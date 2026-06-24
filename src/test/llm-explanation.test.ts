import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/demo-data";
import { explainIssueWithJsonRetry, parseIssueExplanation } from "@/lib/providers/llm";

describe("LLM issue explanation parsing", () => {
  it("parses the SPEC snake_case explanation payload", () => {
    const issue = createInitialState().issues[0];
    const explanation = parseIssueExplanation(
      JSON.stringify({
        problem: "The command omits notes.",
        context: "Notes already exist in storage.",
        likely_files: [{ path: "cmd/info.go", reason: "Owns info output." }],
        time_estimate_mins: 35,
        difficulty: "Beginner",
        gotchas: ["Check snapshots."],
        questions_to_ask: ["Count or list notes?"],
        type: "bug",
        original_language: "Spanish"
      }),
      issue
    );

    expect(explanation.issueContext).toMatchObject({
      problem: "The command omits notes.",
      context: "Notes already exist in storage.",
      gotchas: ["Check snapshots."],
      questionsToAsk: ["Count or list notes?"],
      type: "bug",
      originalLanguage: "Spanish"
    });
    expect(explanation.likelyFiles).toEqual([{ path: "cmd/info.go", reason: "Owns info output." }]);
    expect(explanation.timeEstimateMins).toBe(35);
    expect(explanation.difficulty).toBe("Beginner");
  });

  it("falls back to the existing issue when JSON is invalid", () => {
    const issue = createInitialState().issues[0];
    const explanation = parseIssueExplanation("{bad-json", issue);

    expect(explanation.issueContext).toBe(issue.issueContext);
    expect(explanation.likelyFiles).toBe(issue.likelyFiles);
    expect(explanation.timeEstimateMins).toBe(issue.timeEstimateMins);
    expect(explanation.difficulty).toBe(issue.difficulty);
  });

  it("retries issue explanation once when the provider returns invalid JSON", async () => {
    const issue = createInitialState().issues[0];
    const calls: boolean[] = [];

    const explanation = await explainIssueWithJsonRetry(issue, async (retry) => {
      calls.push(retry);
      return retry
        ? JSON.stringify({
            problem: "Retry problem",
            context: "Retry context",
            likely_files: [{ path: "src/app.ts", reason: "Owns the behavior." }],
            time_estimate_mins: 45,
            difficulty: "Intermediate",
            gotchas: ["Retry gotcha"],
            questions_to_ask: ["Retry question?"],
            type: "bug"
          })
        : "{bad-json";
    });

    expect(calls).toEqual([false, true]);
    expect(explanation.issueContext.problem).toBe("Retry problem");
    expect(explanation.likelyFiles).toEqual([{ path: "src/app.ts", reason: "Owns the behavior." }]);
  });

  it("does not retry issue explanation when the first response is valid JSON", async () => {
    const issue = createInitialState().issues[0];
    const calls: boolean[] = [];

    const explanation = await explainIssueWithJsonRetry(issue, async (retry) => {
      calls.push(retry);
      return JSON.stringify({
        problem: "Valid problem",
        context: "Valid context",
        gotchas: [],
        questions_to_ask: [],
        type: "maintenance"
      });
    });

    expect(calls).toEqual([false]);
    expect(explanation.issueContext.problem).toBe("Valid problem");
  });

  it("ignores invalid difficulty, time estimate, and likely file entries", () => {
    const issue = createInitialState().issues[0];
    const explanation = parseIssueExplanation(
      JSON.stringify({
        problem: "Problem",
        context: "Context",
        likely_files: [{ path: "", reason: "blank" }, { nope: true }],
        time_estimate_mins: -10,
        difficulty: "Expert"
      }),
      issue
    );

    expect(explanation.issueContext.problem).toBe("Problem");
    expect(explanation.likelyFiles).toBeUndefined();
    expect(explanation.timeEstimateMins).toBeUndefined();
    expect(explanation.difficulty).toBeUndefined();
  });

  it("normalizes invalid issue types back to the existing context type", () => {
    const issue = createInitialState().issues[0];
    const explanation = parseIssueExplanation(
      JSON.stringify({
        problem: "Problem",
        context: "Context",
        type: "exploit"
      }),
      issue
    );

    expect(explanation.issueContext.type).toBe(issue.issueContext.type);
  });
});
