/**
 * Strip internal / provider names from messages shown to end users.
 * Keep a short Italian fallback + optional opaque ref for support.
 */

const PROVIDER_LEAK =
  /\b(liteapi|nuit[eé]e|duffel|gettransfer|travelpayouts|viator|omio|stripe|supabase|postgrest|vercel|oauth|turnstile|cloudflare)\b/gi;

const INTERNAL_LEAK =
  /\b(migration\s*\d+|migrazione\s*\d+|TODO\s*LEGAL|stack\s*trace|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|prisma|psql|NEXT_PUBLIC_|ACCESS_TOKEN|\.env)\b/gi;

export function toUserFacingError(
  raw: string | null | undefined,
  fallback = 'Qualcosa non ha funzionato. Riprova tra poco.'
): string {
  const text = (raw ?? '').trim();
  if (!text) return fallback;
  if (PROVIDER_LEAK.test(text) || INTERNAL_LEAK.test(text)) {
    PROVIDER_LEAK.lastIndex = 0;
    INTERNAL_LEAK.lastIndex = 0;
    return fallback;
  }
  // Drop English infra / stack-ish lines.
  if (/^[A-Z_]+(?:Error)?:/.test(text) || text.includes('\n    at ')) {
    return fallback;
  }
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

export function userFacingErrorWithRef(
  raw: string | null | undefined,
  ref: string | null | undefined,
  fallback = 'Pagamento ricevuto, stiamo verificando la prenotazione.'
): string {
  const base = toUserFacingError(raw, fallback);
  if (ref && !base.includes(ref)) return `${base} Codice: ${ref}.`;
  return base;
}
