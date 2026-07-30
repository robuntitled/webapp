export type OmioTransportMode = 'bus' | 'train';

/** Bundle CSS/JS Nemo (Impact Search Widget). */
export const OMIO_NEMO_BUNDLE_BASE =
  'https://www.omio.com/gcs-proxy/b2b-nemo-prod/bundle';

/** Partner id Impact / Omio (es. omiolps). */
export const DEFAULT_OMIO_PARTNER_ID = 'omiolps';

/** Redirect affiliate Impact (ShareASale/Impact tracking). */
export const DEFAULT_OMIO_REDIRECT =
  'https://omio.sjv.io/c/7385/3963000/7385?u=';

export function getOmioPartnerId(): string {
  return (
    process.env.NEXT_PUBLIC_OMIO_PARTNER_ID?.trim() ||
    process.env.NEXT_PUBLIC_OMIO_PARTNER_SLUG?.trim() ||
    DEFAULT_OMIO_PARTNER_ID
  );
}

export function getOmioRedirectUrl(): string {
  return (
    process.env.NEXT_PUBLIC_OMIO_REDIRECT_URL?.trim() || DEFAULT_OMIO_REDIRECT
  );
}

export function getOmioWidgetLocale(): string {
  return process.env.NEXT_PUBLIC_OMIO_WIDGET_LOCALE?.trim() || 'it';
}

/** CSS/JS bundle URLs for locale (cache-bust with `v` at load time). */
export function getOmioNemoBundleUrls(locale = getOmioWidgetLocale()): {
  css: string;
  js: string;
} {
  const lang = locale || 'it';
  const base = `${OMIO_NEMO_BUNDLE_BASE}/${encodeURIComponent(lang)}`;
  return {
    css: `${base}/bundle.css`,
    js: `${base}/bundle.js`,
  };
}

/** Widget always configured when partner id + redirect present (defaults set). */
export function isOmioWidgetConfigured(): boolean {
  return Boolean(getOmioPartnerId() && getOmioRedirectUrl());
}

export function omioTravelModeAttr(mode: OmioTransportMode): string {
  return mode === 'bus' ? 'bus' : 'train';
}
