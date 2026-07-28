import 'server-only';

/** Live: https://api.viator.com/partner — Sandbox: https://api.sandbox.viator.com/partner */
export function getViatorBaseUrl(): string {
  return (
    process.env.VIATOR_BASE_URL?.replace(/\/$/, '') ||
    'https://api.viator.com/partner'
  );
}

export function getViatorApiKey(): string | null {
  const key = process.env.VIATOR_API_KEY?.trim();
  return key || null;
}

export function isViatorConfigured(): boolean {
  return Boolean(getViatorApiKey());
}

export function getViatorCampaign(): string | undefined {
  const c = process.env.VIATOR_CAMPAIGN?.trim();
  return c || undefined;
}

/** Viator: `it` / `it-CH` (non `it-IT`). Override: VIATOR_ACCEPT_LANGUAGE */
export function getViatorAcceptLanguage(): string {
  return process.env.VIATOR_ACCEPT_LANGUAGE?.trim() || 'it';
}
