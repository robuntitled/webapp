import 'server-only';

export function getGygBaseUrl(): string {
  return (
    process.env.GETYOURGUIDE_BASE_URL?.replace(/\/$/, '') ||
    'https://api.getyourguide.com/1'
  );
}

export function getGygAccessToken(): string | null {
  const key = process.env.GETYOURGUIDE_ACCESS_TOKEN?.trim();
  return key || null;
}

export function isGygConfigured(): boolean {
  return Boolean(getGygAccessToken());
}
