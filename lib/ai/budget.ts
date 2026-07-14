import 'server-only';

import type { AiProviderName } from '@/lib/ai/config';
import { getAiConfig, isLocalAiBaseUrl } from '@/lib/ai/config';
import { estimateGeminiCostUsd, estimateOpenAiCompatibleCostUsd } from '@/lib/ai/pricing';

type MonthSpend = {
  monthKey: string;
  spentUsd: number;
};

let monthSpend: MonthSpend = { monthKey: '', spentUsd: 0 };

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function resetIfNewMonth(): void {
  const key = currentMonthKey();
  if (monthSpend.monthKey !== key) {
    monthSpend = { monthKey: key, spentUsd: 0 };
  }
}

export function getMonthlySpendUsd(): number {
  resetIfNewMonth();
  return monthSpend.spentUsd;
}

export function canAffordAiCall(estimatedCostUsd: number, monthlyBudgetUsd: number): boolean {
  if (monthlyBudgetUsd <= 0) return true;
  resetIfNewMonth();
  return monthSpend.spentUsd + estimatedCostUsd <= monthlyBudgetUsd;
}

function estimateCostForProvider(
  inputTokens: number,
  outputTokens: number,
  provider: AiProviderName
): number {
  if (provider === 'openai') {
    const config = getAiConfig();
    return estimateOpenAiCompatibleCostUsd(
      inputTokens,
      outputTokens,
      isLocalAiBaseUrl(config.openaiBaseUrl)
    );
  }
  return estimateGeminiCostUsd(inputTokens, outputTokens);
}

export function recordAiSpend(
  inputTokens: number,
  outputTokens: number,
  provider: AiProviderName = 'gemini'
): number {
  const cost = estimateCostForProvider(inputTokens, outputTokens, provider);
  resetIfNewMonth();
  monthSpend.spentUsd += cost;
  return cost;
}

/** Solo per test — resetta il contatore mensile in memoria. */
export function resetMonthlySpendForTests(): void {
  monthSpend = { monthKey: currentMonthKey(), spentUsd: 0 };
}