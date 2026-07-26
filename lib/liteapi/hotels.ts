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
};

export type HotelSearchInput = {
  cityName: string;
  countryCode: string;
  checkin: string;
  checkout: string;
  adults?: number;
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
  rating?: number;
  stars?: number;
  star_rating?: number;
  review_count?: number;
  hotelFacilities?: Array<{ name?: string; facilityId?: number } | string>;
  facilities?: Array<{ name?: string; facilityId?: number } | string>;
};

type RatesResponse = {
  data?: RawHotelRate[];
  hotels?: RawHotelMeta[];
};

type HotelsListResponse = {
  data?: Array<{ id?: string; name?: string }>;
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
  currency: string
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

      const offer: LiteHotelOffer = {
        hotelId,
        name: meta?.name?.trim() || `Hotel ${hotelId}`,
        address: meta?.address ?? null,
        city: meta?.city_name ?? fallbackCity,
        countryCode: meta?.country_code ?? fallbackCountry,
        photo: meta?.thumbnail || meta?.main_photo || null,
        stars:
          typeof meta?.stars === 'number'
            ? meta.stars
            : typeof meta?.star_rating === 'number'
              ? meta.star_rating
              : null,
        rating: typeof meta?.rating === 'number' ? meta.rating : null,
        reviewCount:
          typeof meta?.review_count === 'number' ? meta.review_count : null,
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
      };

      const prev = bestByHotel.get(hotelId);
      if (!prev || offer.totalAmount < prev.totalAmount) {
        bestByHotel.set(hotelId, offer);
      }
    }
  }

  return [...bestByHotel.values()].sort((a, b) => a.totalAmount - b.totalAmount);
}

async function fetchHotelIds(
  countryCode: string,
  cityName: string,
  max: number
): Promise<string[]> {
  const qs = new URLSearchParams({
    countryCode,
    cityName,
    limit: String(Math.min(100, max)),
  });
  const res = await liteApiFetch<HotelsListResponse>(`/data/hotels?${qs}`, {
    method: 'GET',
    timeoutMs: 15_000,
  });
  const ids = (res.data ?? [])
    .map((h) => h.id)
    .filter((id): id is string => Boolean(id));
  return [...new Set(ids)].slice(0, max);
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
  const currency = (input.currency ?? 'EUR').toUpperCase();
  const guestNationality = (input.guestNationality ?? 'IT').toUpperCase();
  const margin = input.margin ?? getLiteApiDefaultMargin();
  const limit = Math.min(60, Math.max(10, input.limit ?? 36));
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
    occupancies: [{ rooms: 1, adults, children: [] as number[] }],
    timeout: 12,
    roomMapping: true,
    includeHotelData: true,
    maxRatesPerHotel: 1,
    margin,
  };

  if (input.refundableRatesOnly) {
    baseBody.refundableRatesOnly = true;
  }
  if (input.boardTypes?.trim()) {
    baseBody.boardTypes = input.boardTypes.trim();
  }
  if (input.facilityIds?.length) {
    baseBody.facilities = input.facilityIds;
  }

  let hotelIds: string[] = [];
  try {
    hotelIds = await fetchHotelIds(countryCode, cityName, limit);
  } catch (e) {
    console.warn('[liteapi] /data/hotels failed, fallback city rates', e);
  }

  if (hotelIds.length > 0) {
    // Batch da 25 per non sovraccaricare la rates API
    const batches: string[][] = [];
    for (let i = 0; i < hotelIds.length; i += 25) {
      batches.push(hotelIds.slice(i, i + 25));
    }

    const parts = await Promise.all(
      batches.slice(0, 2).map((ids) =>
        liteApiFetch<RatesResponse>('/hotels/rates', {
          method: 'POST',
          body: JSON.stringify({ ...baseBody, hotelIds: ids }),
          timeoutMs: 25_000,
        })
      )
    );

    const merged: RatesResponse = {
      data: parts.flatMap((p) => p.data ?? []),
      hotels: parts.flatMap((p) => p.hotels ?? []),
    };
    const offers = parseOffers(merged, cityName, countryCode, currency);
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
