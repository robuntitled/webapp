import { describe, expect, it } from 'vitest';
import { estimateGeminiCostUsd, estimateTypicalCallCostUsd } from '@/lib/ai/pricing';
import { canAffordAiCall, getMonthlySpendUsd, recordAiSpend, resetMonthlySpendForTests } from '@/lib/ai/budget';

describe('estimateGeminiCostUsd', () => {
  it('returns a small positive cost for typical token counts', () => {
    const cost = estimateGeminiCostUsd(700, 900);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01);
  });
});

describe('budget guard', () => {
  it('allows calls when budget is disabled (0)', () => {
    resetMonthlySpendForTests();
    expect(canAffordAiCall(estimateTypicalCallCostUsd(), 0)).toBe(true);
  });

  it('blocks calls when monthly budget would be exceeded', () => {
    resetMonthlySpendForTests();
    recordAiSpend(5_000_000, 5_000_000);
    expect(canAffordAiCall(0.01, 1)).toBe(false);
    expect(getMonthlySpendUsd()).toBeGreaterThan(1);
  });
});