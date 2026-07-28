import 'server-only';

import type { ActivityOffer } from '@/lib/activities/types';
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
  destinations?: {
    results?: Array<{ id?: number; name?: string }>;
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
      // Prefer ~400px wide thumbs
      return Math.abs(aw - 400) - Math.abs(bw - 400);
    });
  return ranked[0]?.url ?? null;
}

function mapProduct(p: ViatorProduct): ActivityOffer | null {
  const code = p.productCode?.trim();
  const title = p.title?.trim();
  if (!code || !title) return null;

  const bookingUrl =
    p.productUrl?.trim() ||
    `https://www.viator.com/tours/d0-${encodeURIComponent(code)}`;

  return {
    id: `viator:${code}`,
    provider: 'viator',
    title,
    description: p.description?.slice(0, 280) ?? null,
    imageUrl: pickImage(p),
    priceFrom: p.pricing?.summary?.fromPrice ?? null,
    currency: p.pricing?.currency ?? 'EUR',
    rating: p.reviews?.combinedAverageRating ?? null,
    ratingCount: p.reviews?.totalReviews ?? null,
    durationMinutes: p.duration?.fixedDurationInMinutes ?? null,
    bookingUrl,
  };
}

/**
 * Ricerca attività Viator (affiliate): freetext PRODUCTS sulla destinazione.
 */
export async function searchViatorActivities(params: {
  city: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<ActivityOffer[]> {
  if (!isViatorConfigured()) return [];

  const city = params.city.trim();
  const query = params.query?.trim() ?? '';
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 50);
  const searchTerm = [city, query].filter(Boolean).join(' ').slice(0, 120);
  if (!searchTerm) return [];

  let destinationId: string | undefined;
  try {
    const dest = await resolveViatorDestinationId(city);
    if (dest) destinationId = dest.id;
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
  return products.map(mapProduct).filter((x): x is ActivityOffer => x != null);
}
