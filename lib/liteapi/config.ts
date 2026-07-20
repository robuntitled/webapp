import 'server-only';

/** LiteAPI / Nuitee Connect — hotel (e in seguito voli) in-app. */
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
