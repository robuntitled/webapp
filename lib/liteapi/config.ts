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

/** Ambiente payment SDK LiteAPI (`sandbox` | `live`) — deve matchare la API key. */
export function getLiteApiPaymentEnv(): 'sandbox' | 'live' {
  const forced = process.env.LITEAPI_PAYMENT_ENV?.trim().toLowerCase();
  if (forced === 'sandbox' || forced === 'live') return forced;
  const key = getLiteApiKey() ?? '';
  if (key.startsWith('sand_') || /sandbox/i.test(key)) return 'sandbox';
  return 'live';
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
