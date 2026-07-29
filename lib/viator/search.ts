import 'server-only';

import type { ActivityOffer } from '@/lib/activities/types';
import { cleanAffiliateDescription } from '@/lib/travel/affiliate-ui';
import { viatorFetch } from '@/lib/viator/client';
import {
  hasEnoughViatorReviews,
  isViatorConfigured,
} from '@/lib/viator/config';
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

export const ACTIVITIES_PAGE_SIZE = 50;
/** Max start index (1-based) → ~10 pagine × 50 */
const ACTIVITIES_MAX_START = 50 * 10;

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

  // Solo URL affiliate API (path prodotto reale + pid/mcid). Niente fallback
  // generici tipo /tours/d0-CODE che finiscono su destinazione/home.
  const bookingUrl = p.productUrl?.trim();
  if (!bookingUrl || !/^https?:\/\//i.test(bookingUrl)) return null;

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
  totalCount: number | null;
  nextStart: number | null;
  hasMore: boolean;
};

/**
 * Ricerca attività Viator (affiliate): freetext PRODUCTS sulla destinazione.
 * `start` = indice 1-based Viator (1, 49, 97…).
 */
export async function searchViatorActivities(params: {
  city: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  start?: number;
  limit?: number;
}): Promise<ViatorActivitiesSearch> {
  if (!isViatorConfigured()) {
    return {
      results: [],
      destinationName: null,
      totalCount: null,
      nextStart: null,
      hasMore: false,
    };
  }

  const city = params.city.trim();
  const query = params.query?.trim() ?? '';
  const pageSize = Math.min(
    Math.max(params.limit ?? ACTIVITIES_PAGE_SIZE, 1),
    50
  );
  const start = Math.max(1, params.start ?? 1);
  const searchTerm = [city, query].filter(Boolean).join(' ').slice(0, 120);
  if (!searchTerm) {
    return {
      results: [],
      destinationName: null,
      totalCount: null,
      nextStart: null,
      hasMore: false,
    };
  }

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
      {
        searchType: 'PRODUCTS',
        pagination: { start, count: pageSize },
      },
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
  const totalCount =
    typeof data.products?.totalCount === 'number'
      ? data.products.totalCount
      : null;
  const results = products
    .map((p, i) =>
      mapProduct(p, { lat: destLat, lng: destLng }, start - 1 + i)
    )
    .filter((x): x is ActivityOffer => x != null)
    .filter((x) => hasEnoughViatorReviews(x.ratingCount));

  const nextStart = start + pageSize;
  // Usa il conteggio grezzo API (non i soli mappati) + totalCount quando c’è
  const hasMore =
    (totalCount != null
      ? nextStart <= totalCount
      : products.length >= pageSize) && nextStart <= ACTIVITIES_MAX_START;

  return {
    results,
    destinationName,
    totalCount,
    nextStart: hasMore ? nextStart : null,
    hasMore,
  };
}
