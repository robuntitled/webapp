import { describe, expect, it } from 'vitest';
import type { AiConfig } from '@/lib/ai/config';
import {
  isAiTimeoutError,
  resolveAiCallTimeoutMs,
  resolveGeminiAttemptDeadlineMs,
  resolveOrchestratorBudgetMs,
} from '@/lib/ai/timeouts';

const baseConfig = (overrides: Partial<AiConfig> = {}): AiConfig => ({
  provider: 'gemini',
  geminiApiKey: 'k',
  openaiApiKey: undefined,
  openaiBaseUrl: 'http://localhost:11434/v1',
  model: 'gemini-2.5-flash-lite',
  enabled: true,
  mode: 'auto',
  monthlyBudgetUsd: 0,
  maxOutputTokens: 1200,
  cacheTtlMs: 86400000,
  jsonMode: false,
  singleMessagePrompt: false,
  requestTimeoutMs: 0,
  ...overrides,
});

describe('timeouts', () => {
  it('detects timeout errors', () => {
    expect(isAiTimeoutError('AI timeout interno')).toBe(true);
    expect(isAiTimeoutError('Gemini timeout')).toBe(true);
  });

  it('gives gemini more than the old 28s cap but stays under Vercel 60s', () => {
    expect(resolveAiCallTimeoutMs(baseConfig())).toBeGreaterThanOrEqual(40_000);
    expect(resolveOrchestratorBudgetMs(baseConfig())).toBeLessThanOrEqual(58_000);
    expect(resolveOrchestratorBudgetMs(baseConfig())).toBeGreaterThan(28_000);
    expect(resolveGeminiAttemptDeadlineMs(baseConfig())).toBeLessThanOrEqual(52_000);
  });

  it('respects AI_TIMEOUT_MS override', () => {
    expect(resolveAiCallTimeoutMs(baseConfig({ requestTimeoutMs: 30_000 }))).toBe(30_000);
  });
});