import 'server-only';

import { rateLimitAsync } from '@/lib/rate-limit';

/** Limite globale (~10/min) — Redis se disponibile, altrimenti per-istanza. */
export async function canMakeGlobalAiCall(): Promise<{
  ok: boolean;
  retryAfterMs: number;
}> {
  return rateLimitAsync('ai:global', { limit: 6, windowMs: 60_000 });
}

/** @deprecated Usa canMakeGlobalAiCall() */
export async function canMakeGlobalGeminiCall(): Promise<{
  ok: boolean;
  retryAfterMs: number;
}> {
  return canMakeGlobalAiCall();
}
