/**
 * Travelpayouts White Label — configurazione NomadLink.
 *
 * Setup consigliato (Page su sottodominio):
 * 1. CNAME: ricerca.tuodominio.it → target indicato da Travelpayouts
 * 2. Dashboard → WL Web → Page → dominio ricerca.tuodominio.it
 * 3. Design: usa TRAVELPAYOUTS_BRAND_COLORS nel pannello Travelpayouts
 * 4. Logo: carica public/assets/logo.png nell'header WL
 *
 * @see https://support.travelpayouts.com/hc/en-us/articles/16436383582226
 */

export const TRAVELPAYOUTS_BRAND_COLORS = {
  /** Pulsanti, link, icone form — teal NomadLink */
  primary: '#2d5f6e',
  /** Accento secondario — coral */
  accent: '#e67e45',
  pageBackground: '#fafaf9',
  searchFormBackground: '#ffffff',
  buttonText: '#ffffff',
  mainText: '#1e293b',
  headlineText: '#0f172a',
} as const;

export type TravelpayoutsConfig = {
  marker: string | null;
  wlId: string | null;
  flightsDomain: string | null;
  hotelDomain: string | null;
  defaultOriginIata: string;
  hasDataApi: boolean;
  isConfigured: boolean;
  mode: 'subdomain' | 'widget' | 'api' | 'none';
};

function normalizeDomain(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
}

export function getTravelpayoutsConfig(): TravelpayoutsConfig {
  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim() || null;
  const wlId = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_WL_ID?.trim() || null;
  const flightsDomain = normalizeDomain(process.env.NEXT_PUBLIC_TRAVELPAYOUTS_FLIGHTS_DOMAIN);
  const hotelDomain =
    normalizeDomain(process.env.NEXT_PUBLIC_TRAVELPAYOUTS_HOTEL_DOMAIN) ?? flightsDomain;
  const defaultOriginIata =
    process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA?.trim().toUpperCase() || 'ROM';

  const hasDataApi = Boolean(process.env.TRAVELPAYOUTS_API_TOKEN?.trim());
  const hasSubdomain = Boolean(flightsDomain && marker);
  const hasWidget = Boolean(wlId);
  const isConfigured = hasSubdomain || hasWidget || hasDataApi;

  let mode: TravelpayoutsConfig['mode'] = 'none';
  if (hasSubdomain) mode = 'subdomain';
  else if (hasWidget) mode = 'widget';
  else if (hasDataApi) mode = 'api';

  return {
    marker,
    wlId,
    flightsDomain,
    hotelDomain,
    defaultOriginIata,
    hasDataApi,
    isConfigured,
    mode,
  };
}

export function buildMarkerParam(marker: string, subId: string): string {
  const safeSubId = subId.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 128);
  return `${marker}.${safeSubId}`;
}