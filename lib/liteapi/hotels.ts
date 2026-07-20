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
  offerId: string;
  rateId: string;
  totalAmount: number;
  currency: string;
  commissionAmount: number | null;
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
};

type RawRateTotal = { amount?: number | string; currency?: string };
type RawCommission = { amount?: number | string; currency?: string };

type RawRate = {
  rateId?: string;
  name?: string;
  boardName?: string;
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
  review_count?: number;
};

type RatesResponse = {
  data?: RawHotelRate[];
  hotels?: RawHotelMeta[];
};

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Ricerca hotel + tariffe live (city/country).
 * Usa margin per impostare la tua commissione sul prezzo retail.
 */
export async function searchHotelRates(
  input: HotelSearchInput
): Promise<LiteHotelOffer[]> {
  const adults = Math.min(9, Math.max(1, input.adults ?? 2));
  const currency = (input.currency ?? 'EUR').toUpperCase();
  const guestNationality = (input.guestNationality ?? 'IT').toUpperCase();
  const margin = input.margin ?? getLiteApiDefaultMargin();
  const limit = Math.min(40, Math.max(5, input.limit ?? 24));

  const body = {
    checkin: input.checkin,
    checkout: input.checkout,
    currency,
    guestNationality,
    countryCode: input.countryCode.toUpperCase(),
    cityName: input.cityName.trim(),
    occupancies: [{ rooms: 1, adults }],
    timeout: 10,
    roomMapping: true,
    includeHotelData: true,
    margin,
    // Alcune versioni API accettano limit nei filtri; se ignorato ok.
    limit,
  };

  const res = await liteApiFetch<RatesResponse>('/hotels/rates', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 22_000,
  });

  const metaById = new Map(
    (res.hotels ?? [])
      .filter((h) => h.id)
      .map((h) => [h.id as string, h] as const)
  );

  const offers: LiteHotelOffer[] = [];

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

      offers.push({
        hotelId,
        name: meta?.name?.trim() || `Hotel ${hotelId}`,
        address: meta?.address ?? null,
        city: meta?.city_name ?? input.cityName,
        countryCode: meta?.country_code ?? input.countryCode.toUpperCase(),
        photo: meta?.thumbnail || meta?.main_photo || null,
        stars: typeof meta?.stars === 'number' ? meta.stars : null,
        rating: typeof meta?.rating === 'number' ? meta.rating : null,
        reviewCount:
          typeof meta?.review_count === 'number' ? meta.review_count : null,
        roomName: rate.name?.trim() || 'Camera',
        boardName: rate.boardName ?? null,
        offerId,
        rateId: rate.rateId,
        totalAmount: amount,
        currency: (total?.currency || currency).toUpperCase(),
        commissionAmount: toNum(rate.commission?.[0]?.amount),
      });
    }
  }

  offers.sort((a, b) => a.totalAmount - b.totalAmount);
  return offers.slice(0, limit);
}
