import 'server-only';

import { rateLimit } from '@/lib/rate-limit';

/** Limite globale free tier (~10/min) — protegge tutti gli utenti sulla stessa istanza. */
export function canMakeGlobalGeminiCall(): { ok: boolean; retryAfterMs: number } {
  return rateLimit('gemini:global', { limit: 6, windowMs: 60_000 });
}