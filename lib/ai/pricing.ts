/** Stime conservative per Gemini 2.5 Flash (USD per 1M token). */
const GEMINI_25_FLASH_RATES = {
  inputPer1M: 0.075,
  outputPer1M: 0.3,
} as const;

export function estimateGeminiCostUsd(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * GEMINI_25_FLASH_RATES.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * GEMINI_25_FLASH_RATES.outputPer1M;
  return inputCost + outputCost;
}

/** Stima pre-call per budget guard (prompt tipico ~700 in, ~900 out). */
export function estimateTypicalCallCostUsd(): number {
  return estimateGeminiCostUsd(700, 900);
}