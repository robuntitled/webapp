import 'server-only';

import type { AttractionHit } from '@/lib/attractions/types';
import { cleanAffiliateDescription } from '@/lib/travel/affiliate-ui';
import { filterHitsNearDestination } from '@/lib/travel/geo';
import { viatorFetch } from '@/lib/viator/client';
import {
  hasEnoughViatorReviews,
  isViatorConfigured,
} from '@/lib/viator/config';
import { resolveViatorDestinationId } from '@/lib/viator/destinations';

type ImageLike =
  | { height?: number; width?: number; url?: string }
  | {
      isCover?: boolean;
      variants?: Array<{ height?: number; width?: number; url?: string }>;
    };

type ViatorAttraction = {
  attractionId?: number;
  name?: string;
  productCount?: number;
  images?: ImageLike[];
  center?: { latitude?: number; longitude?: number };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
};

type AttractionsSearchResponse = {
  attractions?: ViatorAttraction[];
  totalCount?: number;
};

type ViatorProduct = {
  productCode?: string;
  title?: string;
  description?: string;
  productUrl?: string;
  images?: Array<{
    isCover?: boolean;
    variants?: Array<{ height?: number; width?: number; url?: string }>;
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

type ProductsSearchResponse = {
  products?: ViatorProduct[];
  totalCount?: number;
};

/** Attrazioni POI per pagina → poi espansa in prodotti singoli */
export const ATTRACTIONS_PAGE_SIZE = 6;
/** Prodotti max per ogni POI */
const PRODUCTS_PER_ATTRACTION = 6;
/** Max distanza dal centro destinazione */
export const ATTRACTIONS_MAX_DISTANCE_KM = 15;
/** Max start index attrazioni (~10 pagine × 6) */
const ATTRACTIONS_MAX_START = 6 * 10;

function pickFlatImage(images: ImageLike[] | undefined): string | null {
  if (!images?.length) return null;
  const first = images[0];
  if ('url' in first && typeof first.url === 'string' && first.url) {
    const flat = images.filter(
      (i): i is { height?: number; width?: number; url: string } =>
        'url' in i && typeof i.url === 'string' && Boolean(i.url)
    );
    if (flat.length) {
      return [...flat].sort(
        (a, b) => Math.abs((a.width ?? 0) - 400) - Math.abs((b.width ?? 0) - 400)
      )[0].url;
    }
  }
  const withVariants = images.find(
    (i) => 'variants' in i && Array.isArray(i.variants)
  ) as { variants?: Array<{ width?: number; url?: string }> } | undefined;
  const variants = (withVariants?.variants ?? []).filter((v) => v.url);
  if (!variants.length) return null;
  return (
    [...variants].sort(
      (a, b) => Math.abs((a.width ?? 0) - 400) - Math.abs((b.width ?? 0) - 400)
    )[0]?.url ?? null
  );
}

function pickProductImage(p: ViatorProduct): string | null {
  const images = p.images ?? [];
  const cover = images.find((i) => i.isCover) ?? images[0];
  const variants = (cover?.variants ?? []).filter((v) => v.url);
  if (!variants.length) return null;
  return (
    [...variants].sort(
      (a, b) => Math.abs((a.width ?? 0) - 400) - Math.abs((b.width ?? 0) - 400)
    )[0]?.url ?? null
  );
}

function formatAddress(a: ViatorAttraction['address']): string | null {
  if (!a) return null;
  const parts = [a.street, a.city, a.state, a.postcode].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function mapProductToHit(
  p: ViatorProduct,
  attraction: {
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    index: number;
  }
): AttractionHit | null {
  const code = p.productCode?.trim();
  const title = p.title?.trim();
  if (!code || !title) return null;

  const bookingUrl = p.productUrl?.trim();
  if (!bookingUrl || !/^https?:\/\//i.test(bookingUrl)) return null;

  let lat = attraction.lat;
  let lng = attraction.lng;
  if (lat != null && lng != null && attraction.index > 0) {
    const angle = (attraction.index / PRODUCTS_PER_ATTRACTION) * Math.PI * 2;
    lat = lat + Math.sin(angle) * 0.0015;
    lng = lng + Math.cos(angle) * 0.0015;
  }

  return {
    id: `viator-prod:${code}`,
    provider: 'viator',
    name: title,
    description: cleanAffiliateDescription(p.description),
    imageUrl: pickProductImage(p) ?? null,
    rating: p.reviews?.combinedAverageRating ?? null,
    ratingCount: p.reviews?.totalReviews ?? null,
    productCount: 0,
    freeAttraction: false,
    priceFrom: p.pricing?.summary?.fromPrice ?? null,
    currency: p.pricing?.currency ?? 'EUR',
    durationMinutes: p.duration?.fixedDurationInMinutes ?? null,
    address: [attraction.name, attraction.address].filter(Boolean).join(' · ') || null,
    lat,
    lng,
    bookingUrl,
  };
}

async function productsForAttraction(params: {
  attractionId: number;
  destinationId: string;
  startDate?: string;
  endDate?: string;
}): Promise<ViatorProduct[]> {
  const filtering: Record<string, unknown> = {
    destination: params.destinationId,
    attractionId: params.attractionId,
    includeAutomaticTranslations: true,
  };
  if (params.startDate && params.endDate) {
    filtering.startDate = params.startDate;
    filtering.endDate = params.endDate;
  }

  const data = await viatorFetch<ProductsSearchResponse>('/products/search', {
    method: 'POST',
    body: JSON.stringify({
      filtering,
      sorting: { sort: 'TRAVELER_RATING', order: 'DESCENDING' },
      pagination: { start: 1, count: PRODUCTS_PER_ATTRACTION },
      currency: 'EUR',
    }),
    timeoutMs: 14_000,
  });

  return data.products ?? [];
}

/**
 * Attrazioni → esperienze singole: per ogni POI vicino al centro destinazione
 * recupera i prodotti Viator collegati (biglietti/tour), non il raggruppamento landmark.
 */
export async function searchViatorAttractions(params: {
  city: string;
  query?: string;
  startDate?: string;
  endDate?: string;
  start?: number;
  limit?: number;
}): Promise<{
  results: AttractionHit[];
  destinationName: string | null;
  totalCount: number | null;
  nextStart: number | null;
  hasMore: boolean;
}> {
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
    Math.max(params.limit ?? ATTRACTIONS_PAGE_SIZE, 1),
    10
  );
  const start = Math.max(1, params.start ?? 1);
  if (!city) {
    return {
      results: [],
      destinationName: null,
      totalCount: null,
      nextStart: null,
      hasMore: false,
    };
  }

  const emptyPage = {
    results: [] as AttractionHit[],
    destinationName: null as string | null,
    totalCount: null as number | null,
    nextStart: null as number | null,
    hasMore: false,
  };

  const dest = await resolveViatorDestinationId(city);
  if (!dest) {
    // Senza destinazione: prodotti freetext (singoli), non landmark
    const ft = await viatorFetch<{
      products?: { results?: ViatorProduct[]; totalCount?: number };
    }>('/search/freetext', {
      method: 'POST',
      body: JSON.stringify({
        searchTerm: query || city,
        searchTypes: [
          {
            searchType: 'PRODUCTS',
            pagination: { start, count: Math.min(pageSize * PRODUCTS_PER_ATTRACTION, 30) },
          },
        ],
        currency: 'EUR',
      }),
      timeoutMs: 18_000,
    });
    const results = (ft.products?.results ?? [])
      .map((p, i) =>
        mapProductToHit(p, {
          name: city,
          address: null,
          lat: null,
          lng: null,
          index: i,
        })
      )
      .filter((x): x is AttractionHit => x != null)
      .filter((x) => hasEnoughViatorReviews(x.ratingCount));
    const nextStart = start + pageSize;
    const hasMore =
      results.length >= pageSize && nextStart <= ATTRACTIONS_MAX_START;
    return {
      results,
      destinationName: null,
      totalCount: ft.products?.totalCount ?? null,
      nextStart: hasMore ? nextStart : null,
      hasMore,
    };
  }

  // Fetch un po' più ampio: dopo filtro geo restano meno POI
  const fetchCount = Math.min(pageSize * 3, 30);
  const data = await viatorFetch<AttractionsSearchResponse>('/attractions/search', {
    method: 'POST',
    body: JSON.stringify({
      destinationId: Number(dest.id),
      sorting: { sort: 'DEFAULT' },
      pagination: { start, count: fetchCount },
    }),
    timeoutMs: 18_000,
  });

  let attractions = (data.attractions ?? [])
    .filter((a) => a.attractionId != null && a.name?.trim())
    .map((a) => ({
      attractionId: a.attractionId!,
      name: a.name!.trim(),
      productCount: a.productCount ?? 0,
      address: formatAddress(a.address),
      lat: a.center?.latitude ?? null,
      lng: a.center?.longitude ?? null,
      imageUrl: pickFlatImage(a.images),
    }));

  attractions = filterHitsNearDestination(
    attractions,
    { lat: dest.lat, lng: dest.lng },
    ATTRACTIONS_MAX_DISTANCE_KM
  ).filter((a) => a.productCount > 0);

  if (query) {
    const q = query.toLowerCase();
    attractions = attractions.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.address?.toLowerCase().includes(q) ?? false)
    );
  }

  attractions = attractions.slice(0, pageSize);

  const productBatches = await Promise.all(
    attractions.map(async (a) => {
      try {
        const products = await productsForAttraction({
          attractionId: a.attractionId,
          destinationId: dest.id,
          startDate: params.startDate,
          endDate: params.endDate,
        });
        return { attraction: a, products };
      } catch (e) {
        console.warn('[viator] products for attraction failed', a.attractionId, e);
        return { attraction: a, products: [] as ViatorProduct[] };
      }
    })
  );

  const seen = new Set<string>();
  const results: AttractionHit[] = [];
  for (const { attraction, products } of productBatches) {
    let idx = 0;
    for (const p of products) {
      const hit = mapProductToHit(p, {
        name: attraction.name,
        address: attraction.address,
        lat: attraction.lat,
        lng: attraction.lng,
        index: idx,
      });
      idx += 1;
      if (!hit) continue;
      if (seen.has(hit.id)) continue;
      if (!hasEnoughViatorReviews(hit.ratingCount)) continue;
      // Preferisci immagine prodotto; fallback POI
      if (!hit.imageUrl && attraction.imageUrl) {
        hit.imageUrl = attraction.imageUrl;
      }
      seen.add(hit.id);
      results.push(hit);
    }
  }

  const totalCount =
    typeof data.totalCount === 'number' ? data.totalCount : null;
  const rawPageCount = data.attractions?.length ?? 0;
  const nextStart = start + fetchCount;
  const hasMore =
    (totalCount != null
      ? nextStart <= totalCount
      : rawPageCount >= fetchCount) && nextStart <= ATTRACTIONS_MAX_START;

  return {
    results,
    destinationName: dest.name,
    totalCount,
    nextStart: hasMore ? nextStart : null,
    hasMore,
  };
}
