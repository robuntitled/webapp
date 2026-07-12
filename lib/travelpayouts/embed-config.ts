import { resolveDestinationCoords } from '@/lib/maps/coordinates';
import { TRAVELPAYOUTS_BRAND_COLORS } from '@/lib/travelpayouts/config';
import { resolveDestinationIata } from '@/lib/travelpayouts/iata';
import type { DestinationMeta } from '@/types/composer';

const TPEMD_BASE = 'https://tpemd.com/content';

export type TravelEmbedCredentials = {
  trs: string;
  marker: string;
  campaignId: string;
  searchPromoId: string;
  mapPromoId: string;
};

export type EmbedDraftContext = {
  destination: string;
  destinationMeta?: DestinationMeta | null;
  startDate: string;
  endDate: string;
  originIata: string;
};

export function getTravelEmbedCredentials(): TravelEmbedCredentials | null {
  const trs = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_TRS_ID?.trim();
  const marker = process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MARKER?.trim();
  if (!trs || !marker) return null;

  return {
    trs,
    marker,
    campaignId: process.env.NEXT_PUBLIC_TRAVELPAYOUTS_CAMPAIGN_ID?.trim() || '100',
    searchPromoId: process.env.NEXT_PUBLIC_TRAVELPAYOUTS_SEARCH_PROMO_ID?.trim() || '7879',
    mapPromoId: process.env.NEXT_PUBLIC_TRAVELPAYOUTS_MAP_PROMO_ID?.trim() || '4054',
  };
}

export function buildFlightSearchEmbedUrl(ctx: EmbedDraftContext): string | null {
  const creds = getTravelEmbedCredentials();
  if (!creds) return null;

  const destIata = resolveDestinationIata(ctx.destination);
  const primary = TRAVELPAYOUTS_BRAND_COLORS.primary;

  const params = new URLSearchParams({
    currency: 'eur',
    trs: creds.trs,
    shmarker: creds.marker,
    show_hotels: 'true',
    powered_by: 'true',
    locale: 'it',
    searchUrl: 'www.aviasales.com/search',
    primary_override: primary,
    color_button: primary,
    color_icons: primary,
    color_focused: primary,
    dark: '#262626',
    light: '#FFFFFF',
    secondary: '#FFFFFF',
    special: '#C4C4C4',
    border_radius: '8',
    plain: 'false',
    promo_id: creds.searchPromoId,
    campaign_id: creds.campaignId,
  });

  if (ctx.originIata) params.set('origin', ctx.originIata.toUpperCase());
  if (destIata) params.set('destination', destIata);
  if (ctx.startDate) params.set('depart_date', ctx.startDate);
  if (ctx.endDate) params.set('return_date', ctx.endDate);

  return `${TPEMD_BASE}?${params.toString()}`;
}

export function buildFlightMapEmbedUrl(ctx: EmbedDraftContext): string | null {
  const creds = getTravelEmbedCredentials();
  if (!creds) return null;

  const coords =
    ctx.destinationMeta?.lat != null && ctx.destinationMeta?.lng != null
      ? { lat: ctx.destinationMeta.lat, lng: ctx.destinationMeta.lng }
      : resolveDestinationCoords(ctx.destination, ctx.destinationMeta ?? undefined);

  if (!coords) return null;

  const params = new URLSearchParams({
    currency: 'eur',
    trs: creds.trs,
    shmarker: creds.marker,
    lat: String(coords.lat),
    lng: String(coords.lng),
    powered_by: 'true',
    search_host: 'www.aviasales.com/search',
    locale: 'it',
    origin: ctx.originIata.toUpperCase(),
    value_min: '0',
    value_max: '1000000',
    round_trip: 'true',
    only_direct: 'false',
    radius: '1',
    draggable: 'true',
    disable_zoom: 'false',
    show_logo: 'false',
    scrollwheel: 'false',
    primary: TRAVELPAYOUTS_BRAND_COLORS.primary,
    secondary: '#FFFFFF',
    light: '#FFFFFF',
    width: '1200',
    height: '360',
    zoom: '5',
    promo_id: creds.mapPromoId,
    campaign_id: creds.campaignId,
  });

  if (ctx.startDate) params.set('depart_date', ctx.startDate);
  if (ctx.endDate) params.set('return_date', ctx.endDate);

  return `${TPEMD_BASE}?${params.toString()}`;
}