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

/** Markup % di default sulle tariffe (commissione tua). Override per request possibile. */
export function getLiteApiDefaultMargin(): number {
  const raw = process.env.LITEAPI_MARGIN?.trim();
  if (!raw) return 10;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 40 ? n : 10;
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
