import { describe, expect, it } from "vitest";
import {
  buildLlmCostEstimate,
  estimateLlmCostUsd,
  estimateTokensFromText,
  llmMaxInputTokens,
  llmMaxOutputTokens,
  truncateToInputTokenBudget
} from "@/lib/llm-budget";

describe("LLM budget controls", () => {
  it("uses SPEC input and output token caps", () => {
    expect(llmMaxInputTokens).toBe(16_000);
    expect(llmMaxOutputTokens).toBe(4_096);
  });

  it("estimates token counts and truncates oversized prompts", () => {
    expect(estimateTokensFromText("abcd")).toBe(1);
    expect(estimateTokensFromText("abcde")).toBe(2);

    const prompt = "x".repeat(llmMaxInputTokens * 4 + 100);
    const truncated = truncateToInputTokenBudget(prompt);

    expect(truncated.truncated).toBe(true);
    expect(truncated.estimatedInputTokens).toBe(llmMaxInputTokens);
    expect(truncated.text).toContain("[Truncated to 16000 input tokens for LLM context budget.]");
  });

  it("estimates provider costs without including prompt content", () => {
    expect(estimateLlmCostUsd("gpt-4o-mini", 1_000_000, 1_000_000)).toBe(0.75);

    expect(
      buildLlmCostEstimate({
        model: "claude-3-5-sonnet-latest",
        jobType: "issue_explanation",
        inputText: "x".repeat(400),
        maxOutputTokens: 100
      })
    ).toEqual({
      event: "llm_cost_estimate",
      model: "claude-3-5-sonnet-latest",
      jobType: "issue_explanation",
      estimatedInputTokens: 100,
      maxOutputTokens: 100,
      estimatedCostUsd: 0.0018,
      inputTruncated: false
    });
  });
});
