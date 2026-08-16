import 'server-only';

export function getDuffelAccessToken(): string | null {
  const raw = process.env.DUFFEL_ACCESS_TOKEN || '';
  const token = raw.trim().replace(/^["']|["']$/g, '').trim();
  return token || null;
}

export function isDuffelConfigured(): boolean {
  return Boolean(getDuffelAccessToken());
}

export function isDuffelTestMode(): boolean {
  const token = getDuffelAccessToken() ?? '';
  return token.startsWith('duffel_test_');
}

export function getDuffelBaseUrl(): string {
  return (
    process.env.DUFFEL_API_BASE?.trim().replace(/\/$/, '') ||
    'https://api.duffel.com'
  );
}

export function getDuffelApiVersion(): string {
  return process.env.DUFFEL_API_VERSION?.trim() || 'v2';
}

/** Search radius in km around pickup/dropoff coordinates. */
export function getDuffelCarsRadiusKm(): number {
  const raw = process.env.DUFFEL_CARS_RADIUS_KM?.trim();
  const n = raw ? Number(raw) : 8;
  return Number.isFinite(n) && n >= 1 && n <= 50 ? n : 8;
}
