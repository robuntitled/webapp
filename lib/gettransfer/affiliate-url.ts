import {
  getGetTransferBaseUrl,
  getGetTransferMarker,
  getGetTransferPromoId,
  getGetTransferSubId,
} from '@/lib/gettransfer/config';

const TP_MEDIA_REDIRECT = 'https://tp.media/r';
const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type GetTransferSearchParams = {
  from: string;
  to: string;
  pickupDate?: string;
  pickupTime?: string;
  adults?: number;
  children?: number;
  locale?: string;
};

export function buildMarkerParam(marker: string, subId: string): string {
  const safeSubId = subId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${marker}.${safeSubId}`;
}

/** Avvolge un URL destinazione con il redirect affiliate Travelpayouts (tp.media). */
export function wrapTravelpayoutsAffiliateUrl(
  targetUrl: string,
  marker: string,
  promoId: number,
  subId?: string
): string {
  const url = new URL(TP_MEDIA_REDIRECT);
  url.searchParams.set(
    'marker',
    subId ? buildMarkerParam(marker, subId) : marker
  );
  url.searchParams.set('p', String(promoId));
  url.searchParams.set('u', targetUrl);
  return url.toString();
}

/** URL di ricerca GetTransfer (locale IT, form transfer). */
export function buildGetTransferSearchUrl(params: GetTransferSearchParams): string {
  const from = params.from.trim();
  const to = params.to.trim();
  const locale = params.locale?.trim() || 'it';
  const url = new URL(`/${locale}/transfers/new`, getGetTransferBaseUrl());

  url.searchParams.set('from', from);
  url.searchParams.set('to', to);

  const adults = Math.max(1, params.adults ?? 2);
  const children = Math.max(0, params.children ?? 0);
  url.searchParams.set('adults', String(adults));
  if (children > 0) {
    url.searchParams.set('children', String(children));
  }

  const date = normalizeIsoDate(params.pickupDate);
  const time = normalizeTime(params.pickupTime);
  if (date && time) {
    // Best-effort: il sito può ignorare date_to; l'API partner lo usa.
    url.searchParams.set('date_to', `${date}T${time}:00`);
  }

  return url.toString();
}

export type GetTransferHandoff = {
  url: string;
  hasAffiliateTracking: boolean;
};

/** Handoff verso GetTransfer con marker Travelpayouts se configurato. */
export function buildGetTransferAffiliateHandoff(
  params: GetTransferSearchParams,
  options?: {
    marker?: string | null;
    promoId?: number | null;
    subId?: string | null;
  }
): GetTransferHandoff {
  const target = buildGetTransferSearchUrl(params);
  const marker = options?.marker ?? getGetTransferMarker();
  const promoId = options?.promoId ?? getGetTransferPromoId();
  if (!marker || !promoId) {
    return { url: target, hasAffiliateTracking: false };
  }
  const subId = options?.subId ?? getGetTransferSubId();
  return {
    url: wrapTravelpayoutsAffiliateUrl(target, marker, promoId, subId),
    hasAffiliateTracking: true,
  };
}

function normalizeIsoDate(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v || !YYYY_MM_DD.test(v)) return undefined;
  return v;
}

function normalizeTime(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v || !HH_MM.test(v)) return undefined;
  return v;
}
