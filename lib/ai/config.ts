import 'server-only';

import { getQuotaCooldownRemainingMs } from '@/lib/ai/quota';
import { canMakeGlobalAiCall } from '@/lib/ai/gemini-global-limit';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai/models';

export type AiProviderName = 'gemini' | 'openai' | 'mock';
export type AiComposerMode = 'mock' | 'auto' | 'gemini' | 'openai';

export type AiConfig = {
  provider: AiProviderName;
  geminiApiKey: string | undefined;
  openaiApiKey: string | undefined;
  openaiBaseUrl: string;
  model: string;
  enabled: boolean;
  mode: AiComposerMode;
  monthlyBudgetUsd: number;
  maxOutputTokens: number;
  cacheTtlMs: number;
  /** Usa response_format json_object (Groq/OpenAI). Disabilitare per Ollama locale. */
  jsonMode: boolean;
  /** Unisce system+user in un solo messaggio (modelli piccoli senza role system). */
  singleMessagePrompt: boolean;
  requestTimeoutMs: number;
};

export const DEFAULT_OPENAI_BASE_URL = 'http://localhost:11434/v1';
export const DEFAULT_OPENAI_MODEL = 'llama3.2:3b';

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
  if (value === 'mock' || value === 'gemini' || value === 'openai' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function parseProvider(value: string | undefined): AiProviderName {
  if (value === 'openai' || value === 'mock' || value === 'gemini') return value;
  return 'gemini';
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export function isLocalAiBaseUrl(baseUrl: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal/i.test(baseUrl);
}

export function getAiConfig(): AiConfig {
  const provider = parseProvider(process.env.AI_PROVIDER);
  const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
  const openaiBaseUrl =
    process.env.AI_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    (provider === 'openai' ? DEFAULT_OPENAI_BASE_URL : 'https://api.openai.com/v1');
  const defaultModel =
    provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_GEMINI_MODEL;

  return {
    provider,
    geminiApiKey,
    openaiApiKey: process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY,
    openaiBaseUrl,
    model: process.env.AI_MODEL ?? defaultModel,
    enabled: process.env.AI_COMPOSER_ENABLED === 'true',
    mode: parseMode(process.env.AI_COMPOSER_MODE),
    monthlyBudgetUsd: parsePositiveFloat(process.env.AI_MONTHLY_BUDGET_USD, 0),
    maxOutputTokens: parsePositiveInt(process.env.AI_MAX_OUTPUT_TOKENS, 800),
    cacheTtlMs: parsePositiveInt(process.env.AI_CACHE_TTL_MS, 24 * 60 * 60 * 1000),
    jsonMode: parseBoolean(process.env.AI_JSON_MODE, provider === 'openai' && !isLocalAiBaseUrl(openaiBaseUrl)),
    singleMessagePrompt: parseBoolean(process.env.AI_SINGLE_MESSAGE, provider === 'openai'),
    requestTimeoutMs: parsePositiveInt(process.env.AI_TIMEOUT_MS, 0),
  };
}

export function isAiComposerConfigured(): boolean {
  const config = getAiConfig();
  if (!config.enabled) return false;

  if (config.provider === 'gemini') {
    return Boolean(config.geminiApiKey);
  }

  if (config.provider === 'openai') {
    return (
      Boolean(config.model) &&
      (Boolean(config.openaiApiKey) || isLocalAiBaseUrl(config.openaiBaseUrl))
    );
  }

  return false;
}

function modeAllowsProvider(config: AiConfig): boolean {
  if (config.mode === 'mock') return false;
  if (config.mode === 'gemini') return config.provider === 'gemini';
  if (config.mode === 'openai') return config.provider === 'openai';
  return true;
}

function configuredReason(config: AiConfig): string {
  if (config.provider === 'openai') {
    return 'AI non configurata (AI_COMPOSER_ENABLED=true + AI_BASE_URL + AI_MODEL)';
  }
  return 'AI non configurata (AI_COMPOSER_ENABLED=true + GEMINI_API_KEY)';
}

/**
 * Decide se chiamare un LLM esterno per questa richiesta.
 * mock = mai | gemini/openai = sempre (se configurato) | auto = se quota/cache ok
 */
export function shouldUseExternalAi(): { use: boolean; reason?: string } {
  const config = getAiConfig();

  if (config.mode === 'mock') {
    return { use: false, reason: 'AI_COMPOSER_MODE=mock' };
  }

  if (!isAiComposerConfigured()) {
    return { use: false, reason: configuredReason(config) };
  }

  if (!modeAllowsProvider(config)) {
    return {
      use: false,
      reason: `AI_COMPOSER_MODE=${config.mode} non compatibile con AI_PROVIDER=${config.provider}`,
    };
  }

  const cooldownMs = getQuotaCooldownRemainingMs();
  if (cooldownMs > 0) {
    return {
      use: false,
      reason: `Quota API in cooldown (${Math.ceil(cooldownMs / 1000)}s)`,
    };
  }

  const global = canMakeGlobalAiCall();
  if (!global.ok) {
    return { use: false, reason: 'Limite globale AI raggiunto (6/min)' };
  }

  return { use: true };
}

/** @deprecated Usa shouldUseExternalAi() */
export function shouldUseGemini(): { use: boolean; reason?: string } {
  return shouldUseExternalAi();
}

/** @deprecated Usa isAiComposerConfigured() */
export function isAiComposerAvailable(): boolean {
  return shouldUseExternalAi().use;
}
