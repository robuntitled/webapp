import 'server-only';

import type { AiProviderName } from '@/lib/ai/config';
import { getAiConfig, isLocalAiBaseUrl } from '@/lib/ai/config';
import { estimateGeminiCostUsd, estimateOpenAiCompatibleCostUsd } from '@/lib/ai/pricing';
import { redisGet, redisIncrByFloat } from '@/lib/redis/upstash';

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

function monthTtlMs(): number {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.max(60_000, end.getTime() - now.getTime() + 86_400_000);
}

function spendRedisKey(): string {
  return `ai:spend:${currentMonthKey()}`;
}

export function getMonthlySpendUsd(): number {
  resetIfNewMonth();
  return monthSpend.spentUsd;
}

export async function getMonthlySpendUsdAsync(): Promise<number> {
  resetIfNewMonth();
  const raw = await redisGet(spendRedisKey());
  if (raw != null) {
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) {
      monthSpend = { monthKey: currentMonthKey(), spentUsd: n };
      return n;
    }
  }
  return monthSpend.spentUsd;
}

export function canAffordAiCall(estimatedCostUsd: number, monthlyBudgetUsd: number): boolean {
  if (monthlyBudgetUsd <= 0) return true;
  resetIfNewMonth();
  return monthSpend.spentUsd + estimatedCostUsd <= monthlyBudgetUsd;
}

export async function canAffordAiCallAsync(
  estimatedCostUsd: number,
  monthlyBudgetUsd: number
): Promise<boolean> {
  if (monthlyBudgetUsd <= 0) return true;
  const spent = await getMonthlySpendUsdAsync();
  return spent + estimatedCostUsd <= monthlyBudgetUsd;
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
  void redisIncrByFloat(spendRedisKey(), cost, monthTtlMs());
  return cost;
}

export async function recordAiSpendAsync(
  inputTokens: number,
  outputTokens: number,
  provider: AiProviderName = 'gemini'
): Promise<number> {
  const cost = estimateCostForProvider(inputTokens, outputTokens, provider);
  resetIfNewMonth();
  const remote = await redisIncrByFloat(spendRedisKey(), cost, monthTtlMs());
  if (remote != null) {
    monthSpend = { monthKey: currentMonthKey(), spentUsd: remote };
  } else {
    monthSpend.spentUsd += cost;
  }
  return cost;
}

/** Solo per test — resetta il contatore mensile in memoria. */
export function resetMonthlySpendForTests(): void {
  monthSpend = { monthKey: currentMonthKey(), spentUsd: 0 };
}
