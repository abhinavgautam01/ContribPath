import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/demo-data";
import { parseIssueExplanation } from "@/lib/providers/llm";

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
        type: "bug"
      }),
      issue
    );

    expect(explanation.issueContext).toMatchObject({
      problem: "The command omits notes.",
      context: "Notes already exist in storage.",
      gotchas: ["Check snapshots."],
      questionsToAsk: ["Count or list notes?"],
      type: "bug"
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
});
