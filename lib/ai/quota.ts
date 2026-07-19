import 'server-only';

import {
  getCachedValue,
  getCachedValueAsync,
  setCachedValue,
  setCachedValueAsync,
} from '@/lib/ai/cache';

const QUOTA_COOLDOWN_KEY = 'gemini:quota-until';

export class GeminiQuotaError extends Error {
  retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'GeminiQuotaError';
    this.retryAfterMs = retryAfterMs;
  }
}

export function isGeminiQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('quota exceeded') ||
    lower.includes('exceeded your current quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource exhausted') ||
    lower.includes('too many requests') ||
    lower.includes('free_tier')
  );
}

/** Estrae secondi da messaggi tipo "Please retry in 18.808148056s." */
export function parseRetrySecondsFromGeminiError(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i);
  if (!match?.[1]) return null;
  const seconds = Number.parseFloat(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

export function getQuotaCooldownRemainingMs(): number {
  const until = getCachedValue<number>(QUOTA_COOLDOWN_KEY);
  if (!until) return 0;
  return Math.max(0, until - Date.now());
}

export async function getQuotaCooldownRemainingMsAsync(): Promise<number> {
  const until = await getCachedValueAsync<number>(QUOTA_COOLDOWN_KEY);
  if (!until) return 0;
  return Math.max(0, until - Date.now());
}

export function setQuotaCooldown(errorMessage?: string, fallbackSeconds = 60): number {
  const seconds = parseRetrySecondsFromGeminiError(errorMessage ?? '') ?? fallbackSeconds;
  const retryAfterMs = seconds * 1000;
  setCachedValue(QUOTA_COOLDOWN_KEY, Date.now() + retryAfterMs, retryAfterMs + 10_000);
  return retryAfterMs;
}

export async function setQuotaCooldownAsync(
  errorMessage?: string,
  fallbackSeconds = 60
): Promise<number> {
  const seconds = parseRetrySecondsFromGeminiError(errorMessage ?? '') ?? fallbackSeconds;
  const retryAfterMs = seconds * 1000;
  await setCachedValueAsync(
    QUOTA_COOLDOWN_KEY,
    Date.now() + retryAfterMs,
    retryAfterMs + 10_000
  );
  return retryAfterMs;
}

export function formatQuotaUserMessage(retryAfterMs: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return `Limite gratuito Gemini raggiunto (~10 richieste/min). Riprova tra ${seconds}s`;
}

export function handleGeminiQuotaFailure(message: string): GeminiQuotaError {
  const retryAfterMs = setQuotaCooldown(message);
  return new GeminiQuotaError(formatQuotaUserMessage(retryAfterMs), retryAfterMs);
}

export async function handleGeminiQuotaFailureAsync(
  message: string
): Promise<GeminiQuotaError> {
  const retryAfterMs = await setQuotaCooldownAsync(message);
  return new GeminiQuotaError(formatQuotaUserMessage(retryAfterMs), retryAfterMs);
}
