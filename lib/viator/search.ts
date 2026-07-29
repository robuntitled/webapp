import 'server-only';

import type { ActivityOffer } from '@/lib/activities/types';
import { cleanAffiliateDescription } from '@/lib/travel/affiliate-ui';
import { viatorFetch } from '@/lib/viator/client';
import { isViatorConfigured } from '@/lib/viator/config';
import { resolveViatorDestinationId } from '@/lib/viator/destinations';

type ViatorImageVariant = { height?: number; width?: number; url?: string };
type ViatorProduct = {
  productCode?: string;
  title?: string;
  description?: string;
  productUrl?: string;
  images?: Array<{
    isCover?: boolean;
    variants?: ViatorImageVariant[];
  }>;
  reviews?: {
    totalReviews?: number;
    combinedAverageRating?: number;
  };
  duration?: { fixedDurationInMinutes?: number };
  pricing?: {
    summary?: { fromPrice?: number };
    currency?: string;
  };
};

type FreetextResponse = {
  products?: {
    totalCount?: number;
    results?: ViatorProduct[];
  };
};

function pickImage(p: ViatorProduct): string | null {
  const images = p.images ?? [];
  const cover = images.find((i) => i.isCover) ?? images[0];
  const variants = cover?.variants ?? [];
  if (!variants.length) return null;
  const ranked = [...variants]
    .filter((v) => v.url)
    .sort((a, b) => {
      const aw = a.width ?? 0;
      const bw = b.width ?? 0;
      return Math.abs(aw - 400) - Math.abs(bw - 400);
    });
  return ranked[0]?.url ?? null;
}

function mapProduct(
  p: ViatorProduct,
  coords: { lat: number | null; lng: number | null },
  index: number
): ActivityOffer | null {
  const code = p.productCode?.trim();
  const title = p.title?.trim();
  if (!code || !title) return null;

  const bookingUrl =
    p.productUrl?.trim() ||
    `https://www.viator.com/tours/d0-${encodeURIComponent(code)}`;

  // Leggero offset così i pin non si sovrappongono tutti sul centro città
  let lat = coords.lat;
  let lng = coords.lng;
  if (lat != null && lng != null) {
    const ring = Math.floor(index / 8);
    const slot = index % 8;
    const angle = (slot / 8) * Math.PI * 2;
    const radius = 0.012 + ring * 0.008;
    lat = lat + Math.sin(angle) * radius;
    lng = lng + Math.cos(angle) * radius;
  }

  return {
    id: `viator:${code}`,
    provider: 'viator',
    title,
    description: cleanAffiliateDescription(p.description),
    imageUrl: pickImage(p),
    priceFrom: p.pricing?.summary?.fromPrice ?? null,
    currency: p.pricing?.currency ?? 'EUR',
    rating: p.reviews?.combinedAverageRating ?? null,
    ratingCount: p.reviews?.totalReviews ?? null,
    durationMinutes: p.duration?.fixedDurationInMinutes ?? null,
    lat,
    lng,
    bookingUrl,
  };
}

export type ViatorActivitiesSearch = {
  results: ActivityOffer[];
  destinationName: string | null;
};

/**
 * Ricerca attività Viator (affiliate): freetext PRODUCTS sulla destinazione.
 */
export async function searchViatorActivities(params: {
  city: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ViatorActivitiesSearch> {
  if (!isViatorConfigured()) return { results: [], destinationName: null };

  const city = params.city.trim();
  const query = params.query?.trim() ?? '';
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 50);
  const searchTerm = [city, query].filter(Boolean).join(' ').slice(0, 120);
  if (!searchTerm) return { results: [], destinationName: null };

  let destinationId: string | undefined;
  let destinationName: string | null = null;
  let destLat: number | null = null;
  let destLng: number | null = null;
  try {
    const dest = await resolveViatorDestinationId(city);
    if (dest) {
      destinationId = dest.id;
      destinationName = dest.name;
      destLat = dest.lat;
      destLng = dest.lng;
    }
  } catch {
    // continua senza filtro destinazione
  }

  const productFiltering: Record<string, unknown> = {
    includeAutomaticTranslations: true,
  };
  if (destinationId) productFiltering.destination = destinationId;
  if (params.startDate && params.endDate) {
    productFiltering.dateRange = {
      from: params.startDate,
      to: params.endDate,
    };
  }

  const body: Record<string, unknown> = {
    searchTerm: destinationId ? query || city : searchTerm,
    searchTypes: [
      { searchType: 'PRODUCTS', pagination: { start: 1, count: limit } },
    ],
    productSorting: { sort: 'DEFAULT' },
    productFiltering,
    currency: 'EUR',
  };

  const data = await viatorFetch<FreetextResponse>('/search/freetext', {
    method: 'POST',
    body: JSON.stringify(body),
    timeoutMs: 18_000,
  });

  const products = data.products?.results ?? [];
  const results = products
    .map((p, i) => mapProduct(p, { lat: destLat, lng: destLng }, i))
    .filter((x): x is ActivityOffer => x != null);

  return { results, destinationName };
}
