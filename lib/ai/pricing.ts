import type { AiProviderName } from '@/lib/ai/config';

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

/** Modelli self-hosted / Ollama: costo zero per il budget guard. */
export function estimateOpenAiCompatibleCostUsd(
  inputTokens: number,
  outputTokens: number,
  isLocal: boolean
): number {
  if (isLocal) return 0;
  return estimateGeminiCostUsd(inputTokens, outputTokens);
}

/** Stima pre-call per budget guard (prompt compatto ~350 in, ~600 out). */
export function estimateTypicalCallCostUsd(provider: AiProviderName = 'gemini'): number {
  if (provider === 'openai') {
    return estimateOpenAiCompatibleCostUsd(350, 600, true);
  }
  return estimateGeminiCostUsd(350, 600);
}