import 'server-only';

/**
 * Feature flags runtime (env). Default conservativi per non rompere il deploy.
 */
function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (raw === undefined || raw === '') return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return defaultValue;
}

/** Obbligo telefono per create/join/publish. Default: off (dev). */
export function isPhoneVerifyRequired(): boolean {
  return envFlag('PHONE_VERIFY_REQUIRED', false);
}

/**
 * In produzione, se Upstash manca logga errore (rate-limit/cache per-istanza).
 * Imposta REQUIRE_UPSTASH=false per silenziare in emergenza.
 */
export function requireUpstashInProduction(): boolean {
  return envFlag('REQUIRE_UPSTASH', true);
}

/** Log metriche API (cache hit/miss, latenze) su console strutturata. */
export function isApiMetricsEnabled(): boolean {
  return envFlag('API_METRICS', true);
}

/** TTL cache Places DB (giorni). 0 = mai scadere (legacy). Default 14. */
export function placesCacheTtlDays(): number {
  const n = Number.parseInt(process.env.PLACES_CACHE_TTL_DAYS ?? '14', 10);
  return Number.isFinite(n) && n >= 0 ? n : 14;
}
