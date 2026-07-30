export type OmioTransportMode = 'bus' | 'train';

const DEFAULT_WIDGET_BASE = 'https://widgets-v2.omio.com';

/** Partner slug from Impact/Omio widget script URL (`…/widgets-v2.omio.com/{slug}/widgets.js`). */
export function getOmioPartnerSlug(): string | null {
  return process.env.NEXT_PUBLIC_OMIO_PARTNER_SLUG?.trim() || null;
}

/** Full widget script URL override (paste from Impact → Tools → Omio Search Widget). */
export function getOmioWidgetScriptUrl(): string | null {
  return process.env.NEXT_PUBLIC_OMIO_WIDGET_SCRIPT_URL?.trim() || null;
}

/** Iframe embed src when Impact provides iframe instead of script (optional). */
export function getOmioWidgetIframeSrc(): string | null {
  return process.env.NEXT_PUBLIC_OMIO_WIDGET_IFRAME_SRC?.trim() || null;
}

export function getOmioWidgetType(): string {
  return process.env.NEXT_PUBLIC_OMIO_WIDGET_TYPE?.trim() || 'search';
}

export function getOmioWidgetLocale(): string {
  return process.env.NEXT_PUBLIC_OMIO_WIDGET_LOCALE?.trim() || 'it';
}

export function getOmioSubId(mode: OmioTransportMode): string {
  const dedicated =
    mode === 'bus'
      ? process.env.NEXT_PUBLIC_OMIO_SUBID_BUS?.trim()
      : process.env.NEXT_PUBLIC_OMIO_SUBID_TREN?.trim();
  if (dedicated) return dedicated;
  return mode === 'bus' ? 'prenota_bus' : 'prenota_treni';
}

/** Resolved script URL for the Omio widget loader. */
export function resolveOmioWidgetScriptUrl(): string | null {
  const override = getOmioWidgetScriptUrl();
  if (override) return override;
  const slug = getOmioPartnerSlug();
  if (!slug) return null;
  return `${DEFAULT_WIDGET_BASE}/${encodeURIComponent(slug)}/widgets.js`;
}

export function isOmioWidgetConfigured(): boolean {
  return Boolean(resolveOmioWidgetScriptUrl() || getOmioWidgetIframeSrc());
}

export function buildOmioWidgetLoadOptions(mode: OmioTransportMode): Record<string, string> {
  const locale = getOmioWidgetLocale();
  const subId = getOmioSubId(mode);
  return {
    locale,
    language: locale,
    subId,
    preferredTravelMode: mode,
    travelMode: mode,
  };
}

export function buildOmioIframeSrc(mode: OmioTransportMode): string | null {
  const base = getOmioWidgetIframeSrc();
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set('locale', getOmioWidgetLocale());
    url.searchParams.set('preferredTravelMode', mode);
    url.searchParams.set('subId', getOmioSubId(mode));
    return url.toString();
  } catch {
    return base;
  }
}
