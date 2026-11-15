import 'server-only';

/** LiteAPI / Nuitee Connect — hotel + voli in-app. */
export function getLiteApiKey(): string | null {
  const raw = process.env.LITEAPI_KEY || process.env.LITE_API_KEY || '';
  // Vercel a volte salva con virgolette o newline
  const key = raw.trim().replace(/^["']|["']$/g, '').trim();
  return key || null;
}

export function isLiteApiConfigured(): boolean {
  return Boolean(getLiteApiKey());
}

export type LiteApiMarginInfo = {
  margin: number;
  /** true when env was missing/invalid and we fell back to 10 */
  usedFallback: boolean;
  /** true when margin is explicitly 0 (owner should confirm) */
  isZero: boolean;
  raw: string | null;
};

/** Markup % di default sulle tariffe (commissione tua). Override per request possibile. */
export function parseLiteApiMargin(rawEnv?: string | null): LiteApiMarginInfo {
  const raw = (rawEnv ?? process.env.LITEAPI_MARGIN)?.trim() || null;
  if (!raw) {
    return { margin: 10, usedFallback: true, isZero: false, raw };
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 40) {
    console.warn('[liteapi] LITEAPI_MARGIN invalid, falling back to 10%', { raw });
    return { margin: 10, usedFallback: true, isZero: false, raw };
  }
  if (n === 0) {
    console.warn('[liteapi] LITEAPI_MARGIN is 0 — no service fee applied');
  }
  return { margin: n, usedFallback: false, isZero: n === 0, raw };
}

export function getLiteApiDefaultMargin(): number {
  return parseLiteApiMargin().margin;
}

export function getLiteApiBaseUrl(): string {
  return (
    process.env.LITEAPI_BASE_URL?.trim() || 'https://api.liteapi.travel/v3.0'
  );
}

/** True only when the configured LiteAPI key is clearly a sandbox key. */
export function isLiteApiKeySandbox(): boolean {
  const key = getLiteApiKey() ?? '';
  return key.startsWith('sand_') || /^sand[_-]/i.test(key);
}

/** Ambiente payment SDK LiteAPI (`sandbox` | `live`) — deve matchare la API key. */
export function getLiteApiPaymentEnv(): 'sandbox' | 'live' {
  // Key wins: never report sandbox SDK mode for a live key.
  if (!isLiteApiKeySandbox()) {
    const forced = process.env.LITEAPI_PAYMENT_ENV?.trim().toLowerCase();
    if (forced === 'live') return 'live';
    return 'live';
  }
  const forced = process.env.LITEAPI_PAYMENT_ENV?.trim().toLowerCase();
  if (forced === 'sandbox' || forced === 'live') return forced;
  return 'sandbox';
}

/**
 * Preview/dev must not charge real (live) payments with shared prod keys.
 *
 * Incident 2026-11-12: LITEAPI_PAYMENT_ENV=sandbox with a live LITEAPI_KEY
 * made the old guard return false, so preview charged a real flight.
 * Rule now: non-production allows payments ONLY when the API key itself is
 * sandbox (`sand_…`). Never trust LITEAPI_PAYMENT_ENV alone.
 * Production deploys unchanged.
 */
export function areLivePaymentsBlockedOnThisDeploy(): boolean {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  if (vercelEnv === 'production') return false;
  return !isLiteApiKeySandbox();
}

export const PREVIEW_PAYMENTS_DISABLED_IT =
  'Anteprima: pagamenti disattivati. Usa un ambiente sandbox dedicato (chiave sand_) per testare i pagamenti.';

/** Shared 403 payload for every payment-creating route. */
export function previewPaymentsBlockedResponseBody() {
  return {
    error: PREVIEW_PAYMENTS_DISABLED_IT,
    code: 'PREVIEW_PAYMENTS_DISABLED' as const,
  };
}

/**
 * Publishable key Stripe di LiteAPI (opzionale override).
 * Non usare NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: è un altro account e il form resta vuoto.
 */
export function getLiteApiStripePublishableKey(): string | null {
  const raw = process.env.LITEAPI_STRIPE_PUBLISHABLE_KEY || '';
  const key = raw.trim().replace(/^["']|["']$/g, '').trim();
  return key.startsWith('pk_') ? key : null;
}
