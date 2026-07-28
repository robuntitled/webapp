import 'server-only';

import type { ActivityOffer } from '@/lib/activities/types';
import { gygFetch } from '@/lib/getyourguide/client';
import { isGygConfigured } from '@/lib/getyourguide/config';

/** Thumbnail list size — see GYG image formats wiki */
const GYG_IMAGE_FORMAT = '53';

type GygTour = {
  tour_id?: number | string;
  title?: string;
  abstract?: string;
  overall_rating?: number;
  number_of_ratings?: number;
  url?: string;
  pictures?: Array<{ url?: string; ssl_url?: string }>;
  price?: {
    values?: { amount?: number; currency?: string };
    starting_price?: { amount?: number; currency?: string };
    amount?: number;
    currency?: string;
  };
  durations?: Array<{ duration?: number; unit?: string }>;
};

type GygToursResponse = {
  data?: { tours?: GygTour[] };
};

function resolvePicture(urlTemplate: string | undefined): string | null {
  if (!urlTemplate) return null;
  return urlTemplate.replace('[format_id]', GYG_IMAGE_FORMAT);
}

function extractPrice(t: GygTour): { amount: number | null; currency: string | null } {
  const p = t.price;
  if (!p) return { amount: null, currency: null };
  if (typeof p.amount === 'number') {
    return { amount: p.amount, currency: p.currency ?? 'EUR' };
  }
  if (p.starting_price?.amount != null) {
    return {
      amount: p.starting_price.amount,
      currency: p.starting_price.currency ?? 'EUR',
    };
  }
  if (p.values?.amount != null) {
    return { amount: p.values.amount, currency: p.values.currency ?? 'EUR' };
  }
  return { amount: null, currency: null };
}

function durationMinutes(t: GygTour): number | null {
  const d = t.durations?.[0];
  if (!d?.duration) return null;
  const unit = (d.unit ?? 'minute').toLowerCase();
  if (unit.startsWith('hour')) return Math.round(d.duration * 60);
  if (unit.startsWith('day')) return Math.round(d.duration * 60 * 24);
  return Math.round(d.duration);
}

function mapTour(t: GygTour): ActivityOffer | null {
  const id = t.tour_id != null ? String(t.tour_id) : null;
  const title = t.title?.trim();
  const bookingUrl = t.url?.trim();
  if (!id || !title || !bookingUrl) return null;

  const pic = t.pictures?.[0];
  const { amount, currency } = extractPrice(t);

  return {
    id: `gyg:${id}`,
    provider: 'getyourguide',
    title,
    description: t.abstract?.slice(0, 280) ?? null,
    imageUrl: resolvePicture(pic?.ssl_url || pic?.url),
    priceFrom: amount,
    currency,
    rating: t.overall_rating ?? null,
    ratingCount: t.number_of_ratings ?? null,
    durationMinutes: durationMinutes(t),
    bookingUrl,
  };
}

export async function searchGygActivities(params: {
  city: string;
  query?: string;
  limit?: number;
}): Promise<ActivityOffer[]> {
  if (!isGygConfigured()) return [];

  const city = params.city.trim();
  const query = params.query?.trim() ?? '';
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 50);
  const q = [city, query].filter(Boolean).join(' ').slice(0, 120);
  if (!q) return [];

  const qs = new URLSearchParams({
    q,
    cnt_language: 'it',
    currency: 'EUR',
    limit: String(limit),
    offset: '0',
  });

  const data = await gygFetch<GygToursResponse>(`/tours?${qs.toString()}`, {
    timeoutMs: 18_000,
  });

  const tours = data.data?.tours ?? [];
  return tours.map(mapTour).filter((x): x is ActivityOffer => x != null);
}
