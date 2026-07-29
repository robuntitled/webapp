import 'server-only';

import { liteApiFetch } from '@/lib/liteapi/client';
import { getLiteApiDefaultMargin } from '@/lib/liteapi/config';

export type LiteHotelOffer = {
  hotelId: string;
  name: string;
  address: string | null;
  city: string | null;
  countryCode: string | null;
  photo: string | null;
  stars: number | null;
  rating: number | null;
  reviewCount: number | null;
  roomName: string;
  boardName: string | null;
  boardType: string | null;
  offerId: string;
  rateId: string;
  totalAmount: number;
  currency: string;
  commissionAmount: number | null;
  refundable: boolean;
  freeCancellation: boolean;
  facilities: string[];
  lat: number | null;
  lng: number | null;
};

export type HotelSearchInput = {
  cityName: string;
  countryCode: string;
  checkin: string;
  checkout: string;
  adults?: number;
  /** Età bambini (anni), come richiesto da LiteAPI occupancies.children */
  childrenAges?: number[];
  currency?: string;
  guestNationality?: string;
  /** Override markup % (default da env). */
  margin?: number;
  limit?: number;
  /** Solo tariffe rimborsabili / cancellazione gratuita */
  refundableRatesOnly?: boolean;
  /** Es. BB = bed & breakfast */
  boardTypes?: string;
  /** Facility IDs LiteAPI (es. piscina) */
  facilityIds?: number[];
  minStars?: number;
};

type RawRateTotal = { amount?: number | string; currency?: string };
type RawCommission = { amount?: number | string; currency?: string };

type RawRate = {
  rateId?: string;
  name?: string;
  boardName?: string;
  boardType?: string;
  boardCode?: string;
  refundable?: boolean;
  cancellationPolicies?: {
    refundableTag?: string;
    cancelPolicyInfos?: Array<{ cancelTime?: string; amount?: number }>;
  };
  retailRate?: { total?: RawRateTotal[] };
  commission?: RawCommission[];
};

type RawRoomType = {
  offerId?: string;
  rates?: RawRate[];
};

type RawHotelRate = {
  hotelId?: string;
  roomTypes?: RawRoomType[];
};

type RawHotelMeta = {
  id?: string;
  name?: string;
  main_photo?: string;
  thumbnail?: string;
  address?: string;
  country_code?: string;
  city_name?: string;
  city?: string;
  rating?: number;
  stars?: number;
  star_rating?: number;
  starRating?: number;
  review_count?: number;
  reviewCount?: number;
  hotelFacilities?: Array<{ name?: string; facilityId?: number } | string>;
  facilities?: Array<{ name?: string; facilityId?: number } | string>;
  location?: { latitude?: number | string; longitude?: number | string; lat?: number | string; lng?: number | string };
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
};

type RatesResponse = {
  data?: RawHotelRate[];
  hotels?: RawHotelMeta[];
};

type HotelsListResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    location?: RawHotelMeta['location'];
    latitude?: number | string;
    longitude?: number | string;
    lat?: number | string;
    lng?: number | string;
  }>;
};

/** LiteAPI catalogo città spesso in inglese. */
const CITY_ALIASES: Record<string, string> = {
  roma: 'Rome',
  rome: 'Rome',
  milano: 'Milan',
  milan: 'Milan',
  napoli: 'Naples',
  naples: 'Naples',
  firenze: 'Florence',
  florence: 'Florence',
  venezia: 'Venice',
  venice: 'Venice',
  torino: 'Turin',
  turin: 'Turin',
  palermo: 'Palermo',
  bologna: 'Bologna',
  genova: 'Genoa',
  genoa: 'Genoa',
  verona: 'Verona',
  barcellona: 'Barcelona',
  barcelona: 'Barcelona',
  parigi: 'Paris',
  paris: 'Paris',
  londra: 'London',
  london: 'London',
  lisbona: 'Lisbon',
  lisbon: 'Lisbon',
  atene: 'Athens',
  athens: 'Athens',
  madrid: 'Madrid',
  amsterdam: 'Amsterdam',
  berlino: 'Berlin',
  berlin: 'Berlin',
  vienna: 'Vienna',
  praga: 'Prague',
  prague: 'Prague',
  cairo: 'Cairo',
  'il cairo': 'Cairo',
  egitto: 'Cairo',
  'sharm el sheikh': 'Sharm El Sheikh',
  sharm: 'Sharm El Sheikh',
  hurghada: 'Hurghada',
  tbilisi: 'Tbilisi',
  tbilissi: 'Tbilisi',
  georgia: 'Tbilisi',
  batumi: 'Batumi',
  marrakech: 'Marrakech',
  marocco: 'Marrakech',
  casablanca: 'Casablanca',
  zagabria: 'Zagreb',
  zagreb: 'Zagreb',
  dubrovnik: 'Dubrovnik',
  istanbul: 'Istanbul',
  bali: 'Bali',
  singapore: 'Singapore',
  seoul: 'Seoul',
  sydney: 'Sydney',
  malta: 'Valletta',
};

function normalizeCityName(city: string): string {
  const key = city.trim().toLowerCase();
  return CITY_ALIASES[key] || city.trim();
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function facilityNames(meta?: RawHotelMeta): string[] {
  const raw = meta?.hotelFacilities ?? meta?.facilities ?? [];
  return raw
    .map((f) => (typeof f === 'string' ? f : f?.name))
    .filter((n): n is string => Boolean(n && n.trim()))
    .map((n) => n.trim());
}

function hotelCoords(meta?: RawHotelMeta): { lat: number | null; lng: number | null } {
  if (!meta) return { lat: null, lng: null };
  const loc = meta.location;
  const lat =
    toNum(loc?.latitude) ??
    toNum(loc?.lat) ??
    toNum(meta.latitude) ??
    toNum(meta.lat);
  const lng =
    toNum(loc?.longitude) ??
    toNum(loc?.lng) ??
    toNum(meta.longitude) ??
    toNum(meta.lng);
  if (
    lat == null ||
    lng == null ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return { lat: null, lng: null };
  }
  return { lat, lng };
}

function isRefundableRate(rate: RawRate): boolean {
  if (rate.refundable === true) return true;
  const tag = rate.cancellationPolicies?.refundableTag?.toLowerCase() ?? '';
  if (tag.includes('refundable') || tag.includes('free')) return true;
  const infos = rate.cancellationPolicies?.cancelPolicyInfos ?? [];
  if (infos.some((i) => i.amount === 0)) return true;
  return false;
}

function parseOffers(
  res: RatesResponse,
  fallbackCity: string,
  fallbackCountry: string,
  currency: string,
  coordsFallback?: Map<string, { lat: number; lng: number }>
): LiteHotelOffer[] {
  const metaById = new Map(
    (res.hotels ?? [])
      .filter((h) => h.id)
      .map((h) => [h.id as string, h] as const)
  );

  const bestByHotel = new Map<string, LiteHotelOffer>();

  for (const row of res.data ?? []) {
    const hotelId = row.hotelId;
    if (!hotelId) continue;
    const meta = metaById.get(hotelId);

    for (const room of row.roomTypes ?? []) {
      const offerId = room.offerId;
      if (!offerId) continue;
      const rate = room.rates?.[0];
      if (!rate?.rateId) continue;

      const total = rate.retailRate?.total?.[0];
      const amount = toNum(total?.amount);
      if (amount == null) continue;

      const refundable = isRefundableRate(rate);
      const boardType = rate.boardType ?? rate.boardCode ?? null;
      const fromMeta = hotelCoords(meta);
      const fromCatalog = coordsFallback?.get(hotelId);
      const coords = {
        lat: fromMeta.lat ?? fromCatalog?.lat ?? null,
        lng: fromMeta.lng ?? fromCatalog?.lng ?? null,
      };

      const offer: LiteHotelOffer = {
        hotelId,
        name: meta?.name?.trim() || `Hotel ${hotelId}`,
        address: meta?.address ?? null,
        city: meta?.city_name ?? meta?.city ?? fallbackCity,
        countryCode: meta?.country_code ?? fallbackCountry,
        photo: meta?.thumbnail || meta?.main_photo || null,
        stars:
          typeof meta?.stars === 'number'
            ? meta.stars
            : typeof meta?.star_rating === 'number'
              ? meta.star_rating
              : typeof meta?.starRating === 'number'
                ? meta.starRating
                : null,
        rating: typeof meta?.rating === 'number' ? meta.rating : null,
        reviewCount:
          typeof meta?.review_count === 'number'
            ? meta.review_count
            : typeof meta?.reviewCount === 'number'
              ? meta.reviewCount
              : null,
        roomName: rate.name?.trim() || 'Camera',
        boardName: rate.boardName ?? null,
        boardType,
        offerId,
        rateId: rate.rateId,
        totalAmount: amount,
        currency: (total?.currency || currency).toUpperCase(),
        commissionAmount: toNum(rate.commission?.[0]?.amount),
        refundable,
        freeCancellation: refundable,
        facilities: facilityNames(meta),
        lat: coords.lat,
        lng: coords.lng,
      };

      const prev = bestByHotel.get(hotelId);
      if (!prev || offer.totalAmount < prev.totalAmount) {
        bestByHotel.set(hotelId, offer);
      }
    }
  }

  return [...bestByHotel.values()].sort((a, b) => a.totalAmount - b.totalAmount);
}

async function fetchHotelCatalog(
  countryCode: string,
  cityName: string,
  max: number
): Promise<{ ids: string[]; coordsById: Map<string, { lat: number; lng: number }> }> {
  const qs = new URLSearchParams({
    countryCode,
    cityName,
    limit: String(Math.min(100, Math.max(1, max))),
  });
  const res = await liteApiFetch<HotelsListResponse>(`/data/hotels?${qs}`, {
    method: 'GET',
    timeoutMs: 20_000,
  });
  const coordsById = new Map<string, { lat: number; lng: number }>();
  const ids: string[] = [];
  for (const h of res.data ?? []) {
    if (!h.id) continue;
    ids.push(h.id);
    const coords = hotelCoords(h);
    if (coords.lat != null && coords.lng != null) {
      coordsById.set(h.id, { lat: coords.lat, lng: coords.lng });
    }
  }
  return { ids: [...new Set(ids)].slice(0, max), coordsById };
}

/**
 * Ricerca hotel + tariffe live.
 * 1) catalogo statico città → hotel IDs
 * 2) rates su batch di ID (più affidabile del solo cityName sui rates)
 * Fallback: rates diretti per city/country.
 */
export async function searchHotelRates(
  input: HotelSearchInput
): Promise<LiteHotelOffer[]> {
  const adults = Math.min(9, Math.max(1, input.adults ?? 2));
  const childrenAges = (input.childrenAges ?? [])
    .map((a) => Math.min(17, Math.max(0, Math.round(a))))
    .slice(0, 6);
  const currency = (input.currency ?? 'EUR').toUpperCase();
  const guestNationality = (input.guestNationality ?? 'IT').toUpperCase();
  const margin = input.margin ?? getLiteApiDefaultMargin();
  // Più hotel: catalogo fino a 100 ID, rates su più batch
  const limit = Math.min(100, Math.max(20, input.limit ?? 80));
  const countryCode = input.countryCode.toUpperCase();
  const cityName = normalizeCityName(input.cityName);

  // Evita richieste con date nel passato (sandbox/prod spesso rispondono vuoto)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let checkin = input.checkin;
  let checkout = input.checkout;
  if (new Date(checkin) < today) {
    const inD = new Date(today);
    inD.setDate(inD.getDate() + 21);
    const outD = new Date(inD);
    outD.setDate(outD.getDate() + 4);
    checkin = inD.toISOString().slice(0, 10);
    checkout = outD.toISOString().slice(0, 10);
    console.warn('[liteapi hotels] date nel passato → shift a', checkin, checkout);
  }

  const baseBody: Record<string, unknown> = {
    checkin,
    checkout,
    currency,
    guestNationality,
    occupancies: [{ rooms: 1, adults, children: childrenAges }],
    timeout: 12,
    roomMapping: true,
    includeHotelData: true,
    maxRatesPerHotel: 1,
    margin,
  };

  // Filtri (colazione, refundable, piscina) applicati a valle: non restringere la rates API

  let hotelIds: string[] = [];
  let coordsById = new Map<string, { lat: number; lng: number }>();
  try {
    const catalog = await fetchHotelCatalog(countryCode, cityName, limit);
    hotelIds = catalog.ids;
    coordsById = catalog.coordsById;
  } catch (e) {
    console.warn('[liteapi] /data/hotels failed, fallback city rates', e);
  }

  if (hotelIds.length > 0) {
    const batchSize = 25;
    const maxBatches = 4; // fino a 100 hotel
    const batches: string[][] = [];
    for (let i = 0; i < hotelIds.length; i += batchSize) {
      batches.push(hotelIds.slice(i, i + batchSize));
    }

    const parts = await Promise.all(
      batches.slice(0, maxBatches).map((ids) =>
        liteApiFetch<RatesResponse>('/hotels/rates', {
          method: 'POST',
          body: JSON.stringify({ ...baseBody, hotelIds: ids }),
          timeoutMs: 30_000,
        })
      )
    );

    const merged: RatesResponse = {
      data: parts.flatMap((p) => p.data ?? []),
      hotels: parts.flatMap((p) => p.hotels ?? []),
    };
    const offers = parseOffers(
      merged,
      cityName,
      countryCode,
      currency,
      coordsById
    );
    if (offers.length > 0) return offers.slice(0, limit);
  }

  // Fallback: ricerca diretta per città (inglese)
  const res = await liteApiFetch<RatesResponse>('/hotels/rates', {
    method: 'POST',
    body: JSON.stringify({
      ...baseBody,
      countryCode,
      cityName,
    }),
    timeoutMs: 25_000,
  });

  return parseOffers(res, cityName, countryCode, currency).slice(0, limit);
}
