import 'server-only';

import { estimateGeminiCostUsd } from '@/lib/ai/pricing';

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

export function recordAiSpend(inputTokens: number, outputTokens: number): number {
  const cost = estimateGeminiCostUsd(inputTokens, outputTokens);
  resetIfNewMonth();
  monthSpend.spentUsd += cost;
  return cost;
}

/** Solo per test — resetta il contatore mensile in memoria. */
export function resetMonthlySpendForTests(): void {
  monthSpend = { monthKey: currentMonthKey(), spentUsd: 0 };
}