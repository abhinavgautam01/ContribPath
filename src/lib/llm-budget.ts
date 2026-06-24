export const llmMaxInputTokens = 16_000;
export const llmMaxOutputTokens = 4_096;
const approximateCharsPerToken = 4;

const modelPricingUsdPerMillionTokens: Record<string, { input: number; output: number }> = {
  "claude-3-5-sonnet-latest": { input: 3, output: 15 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  demo: { input: 0, output: 0 }
};

export function estimateTokensFromText(text: string) {
  return Math.max(1, Math.ceil(text.length / approximateCharsPerToken));
}

export function truncateToInputTokenBudget(text: string, maxInputTokens = llmMaxInputTokens) {
  const maxChars = maxInputTokens * approximateCharsPerToken;
  if (text.length <= maxChars) {
    return {
      text,
      truncated: false,
      estimatedInputTokens: estimateTokensFromText(text)
    };
  }

  return {
    text: `${text.slice(0, maxChars)}\n\n[Truncated to ${maxInputTokens} input tokens for LLM context budget.]`,
    truncated: true,
    estimatedInputTokens: maxInputTokens
  };
}

export function estimateLlmCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const pricing = modelPricingUsdPerMillionTokens[model] ?? { input: 0, output: 0 };
  return Number(((inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000).toFixed(6));
}

export function buildLlmCostEstimate(input: {
  model: string;
  jobType: "issue_explanation" | "plan_generation";
  inputText: string;
  maxOutputTokens?: number;
}) {
  const inputBudget = truncateToInputTokenBudget(input.inputText);
  const maxOutputTokens = input.maxOutputTokens ?? llmMaxOutputTokens;
  return {
    event: "llm_cost_estimate",
    model: input.model,
    jobType: input.jobType,
    estimatedInputTokens: inputBudget.estimatedInputTokens,
    maxOutputTokens,
    estimatedCostUsd: estimateLlmCostUsd(input.model, inputBudget.estimatedInputTokens, maxOutputTokens),
    inputTruncated: inputBudget.truncated
  };
}
