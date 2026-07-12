import 'server-only';

import { DEFAULT_GEMINI_MODEL } from '@/lib/ai/models';

export type AiProviderName = 'gemini' | 'openai' | 'mock';

export type AiConfig = {
  provider: AiProviderName;
  geminiApiKey: string | undefined;
  model: string;
  enabled: boolean;
  monthlyBudgetUsd: number;
  maxOutputTokens: number;
  cacheTtlMs: number;
};

function parsePositiveFloat(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getAiConfig(): AiConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  const provider = (process.env.AI_PROVIDER ?? 'gemini') as AiProviderName;
  const explicitEnabled = process.env.AI_COMPOSER_ENABLED;

  return {
    provider,
    geminiApiKey,
    model: process.env.AI_MODEL ?? DEFAULT_GEMINI_MODEL,
    enabled:
      explicitEnabled === 'true' ||
      (explicitEnabled !== 'false' && Boolean(geminiApiKey)),
    monthlyBudgetUsd: parsePositiveFloat(process.env.AI_MONTHLY_BUDGET_USD, 0),
    maxOutputTokens: parsePositiveInt(process.env.AI_MAX_OUTPUT_TOKENS, 1200),
    cacheTtlMs: parsePositiveInt(process.env.AI_CACHE_TTL_MS, 24 * 60 * 60 * 1000),
  };
}

export function isAiComposerAvailable(): boolean {
  const config = getAiConfig();
  return config.enabled && config.provider === 'gemini' && Boolean(config.geminiApiKey);
}