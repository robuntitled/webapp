import 'server-only';

import { getQuotaCooldownRemainingMs } from '@/lib/ai/quota';
import { canMakeGlobalGeminiCall } from '@/lib/ai/gemini-global-limit';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai/models';

export type AiProviderName = 'gemini' | 'openai' | 'mock';
export type AiComposerMode = 'mock' | 'auto' | 'gemini';

export type AiConfig = {
  provider: AiProviderName;
  geminiApiKey: string | undefined;
  model: string;
  enabled: boolean;
  mode: AiComposerMode;
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

function parseMode(value: string | undefined): AiComposerMode {
  if (value === 'mock' || value === 'gemini' || value === 'auto') return value;
  return 'auto';
}

export function getAiConfig(): AiConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;

  return {
    provider: (process.env.AI_PROVIDER ?? 'gemini') as AiProviderName,
    geminiApiKey,
    model: process.env.AI_MODEL ?? DEFAULT_GEMINI_MODEL,
    /** Gemini solo se esplicitamente abilitato — la key da sola non basta. */
    enabled: process.env.AI_COMPOSER_ENABLED === 'true',
    mode: parseMode(process.env.AI_COMPOSER_MODE),
    monthlyBudgetUsd: parsePositiveFloat(process.env.AI_MONTHLY_BUDGET_USD, 0),
    maxOutputTokens: parsePositiveInt(process.env.AI_MAX_OUTPUT_TOKENS, 1200),
    cacheTtlMs: parsePositiveInt(process.env.AI_CACHE_TTL_MS, 24 * 60 * 60 * 1000),
  };
}

export function isAiComposerConfigured(): boolean {
  const config = getAiConfig();
  return config.enabled && config.provider === 'gemini' && Boolean(config.geminiApiKey);
}

/**
 * Decide se chiamare Gemini per questa richiesta.
 * mock = mai | gemini = sempre (se configurato) | auto = se quota/cache ok
 */
export function shouldUseGemini(): { use: boolean; reason?: string } {
  const config = getAiConfig();

  if (config.mode === 'mock') {
    return { use: false, reason: 'AI_COMPOSER_MODE=mock' };
  }

  if (!isAiComposerConfigured()) {
    return { use: false, reason: 'AI non configurata (AI_COMPOSER_ENABLED=true + GEMINI_API_KEY)' };
  }

  const cooldownMs = getQuotaCooldownRemainingMs();
  if (cooldownMs > 0) {
    return {
      use: false,
      reason: `Quota Gemini in cooldown (${Math.ceil(cooldownMs / 1000)}s)`,
    };
  }

  const global = canMakeGlobalGeminiCall();
  if (!global.ok) {
    return { use: false, reason: 'Limite globale Gemini raggiunto (6/min)' };
  }

  if (config.mode === 'gemini') {
    return { use: true };
  }

  return { use: true };
}

/** @deprecated Usa shouldUseGemini() */
export function isAiComposerAvailable(): boolean {
  return shouldUseGemini().use;
}