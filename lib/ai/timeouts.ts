import type { AiConfig } from '@/lib/ai/config';

const GEMINI_DEFAULT_CALL_MS = 40_000;
const OPENAI_DEFAULT_CALL_MS = 45_000;
/** Margine per retry JSON + quote travel; cap sotto maxDuration=60 su Vercel. */
const ORCHESTRATOR_CAP_MS = 58_000;

export function isAiTimeoutError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('timeout') || lower.includes('abort');
}

/** Timeout per singola chiamata al provider. */
export function resolveAiCallTimeoutMs(config: AiConfig): number {
  if (config.requestTimeoutMs > 0) return config.requestTimeoutMs;
  return config.provider === 'openai' ? OPENAI_DEFAULT_CALL_MS : GEMINI_DEFAULT_CALL_MS;
}

/** Budget totale orchestrator (AI + quote travel + margine), max 58s. */
export function resolveOrchestratorBudgetMs(config: AiConfig): number {
  const callMs = resolveAiCallTimeoutMs(config);
  const retryHeadroom = config.provider === 'gemini' ? 14_000 : 8_000;
  return Math.min(callMs + retryHeadroom, ORCHESTRATOR_CAP_MS);
}

/** Deadline interna per tentativi Gemini (sotto il cap Vercel). */
export function resolveGeminiAttemptDeadlineMs(config: AiConfig): number {
  const callMs = resolveAiCallTimeoutMs(config);
  return Math.min(callMs + 12_000, 52_000);
}