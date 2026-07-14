import 'server-only';

import { rateLimit } from '@/lib/rate-limit';

/** Limite globale (~10/min) — protegge tutti gli utenti sulla stessa istanza. */
export function canMakeGlobalAiCall(): { ok: boolean; retryAfterMs: number } {
  return rateLimit('ai:global', { limit: 6, windowMs: 60_000 });
}

/** @deprecated Usa canMakeGlobalAiCall() */
export function canMakeGlobalGeminiCall(): { ok: boolean; retryAfterMs: number } {
  return canMakeGlobalAiCall();
}