import type { AiProviderName } from '@/lib/ai/config';
import { DEFAULT_GEMINI_MODEL, PREMIUM_GEMINI_MODEL } from '@/lib/ai/models';

/**
 * Google AI pricing (USD / 1M tokens) — see Google AI pricing page (finanza F-A5).
 * gemini-2.5-flash-lite: 0.10 in / 0.40 out
 * gemini-2.5-flash: 0.30 in / 2.50 out
 */
const MODEL_RATES: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'gemini-2.5-flash-lite': { inputPer1M: 0.1, outputPer1M: 0.4 },
  'gemini-2.5-flash': { inputPer1M: 0.3, outputPer1M: 2.5 },
  // TODO verify price: premium name not on public list — use 2.5-flash as conservative upper bound
  [PREMIUM_GEMINI_MODEL]: { inputPer1M: 0.3, outputPer1M: 2.5 },
  [DEFAULT_GEMINI_MODEL]: { inputPer1M: 0.1, outputPer1M: 0.4 },
};

function ratesFor(model?: string) {
  if (model && MODEL_RATES[model]) return MODEL_RATES[model]!;
  return MODEL_RATES['gemini-2.5-flash-lite']!;
}

export function estimateGeminiCostUsd(
  inputTokens: number,
  outputTokens: number,
  model?: string
): number {
  const rates = ratesFor(model);
  const inputCost = (inputTokens / 1_000_000) * rates.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * rates.outputPer1M;
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
  return estimateGeminiCostUsd(350, 600, DEFAULT_GEMINI_MODEL);
}
