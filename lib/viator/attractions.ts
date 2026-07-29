import 'server-only';

import type { AttractionHit } from '@/lib/attractions/types';
import { cleanAffiliateDescription } from '@/lib/travel/affiliate-ui';
import { viatorFetch } from '@/lib/viator/client';
import { isViatorConfigured } from '@/lib/viator/config';
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
  attractionUrl?: string;
  productCount?: number;
  freeAttraction?: boolean;
  openingHours?: string;
  images?: ImageLike[];
  reviews?: {
    totalReviews?: number;
    combinedAverageRating?: number;
  };
  center?: { latitude?: number; longitude?: number };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
  };
  description?: string;
};

type AttractionsSearchResponse = {
  attractions?: ViatorAttraction[];
  totalCount?: number;
};

export const ATTRACTIONS_PAGE_SIZE = 30;

type FreetextAttractions = {
  attractions?: {
    results?: Array<{
      id?: number;
      name?: string;
      description?: string;
      productsCount?: number;
      destinationName?: string;
      images?: ImageLike[];
      reviews?: {
        totalReviews?: number;
        combinedAverageRating?: number;
      };
    }>;
  };
};

function pickImageUrl(images: ImageLike[] | undefined): string | null {
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
  return [...variants].sort(
    (a, b) => Math.abs((a.width ?? 0) - 400) - Math.abs((b.width ?? 0) - 400)
  )[0]?.url ?? null;
}

function formatAddress(a: ViatorAttraction['address']): string | null {
  if (!a) return null;
  const parts = [a.street, a.city, a.state, a.postcode].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function mapAttraction(a: ViatorAttraction): AttractionHit | null {
  const id = a.attractionId;
  const name = a.name?.trim();
  if (id == null || !name) return null;

  const bookingUrl =
    a.attractionUrl?.trim() ||
    `https://www.viator.com/attractions/-/d0-a${id}`;

  const address = formatAddress(a.address);
  const description =
    cleanAffiliateDescription(a.description) ||
    cleanAffiliateDescription(
      a.openingHours ? `Orari: ${a.openingHours}` : null
    ) ||
    (address
      ? cleanAffiliateDescription(
          `${address}${a.productCount ? ` · ${a.productCount} esperienze collegate` : ''}`
        )
      : a.productCount
        ? `${a.productCount} esperienze collegate su Viator`
        : null);

  return {
    id: `viator-attr:${id}`,
    provider: 'viator',
    name,
    description,
    imageUrl: pickImageUrl(a.images),
    rating: a.reviews?.combinedAverageRating ?? null,
    ratingCount: a.reviews?.totalReviews ?? null,
    productCount: a.productCount ?? 0,
    freeAttraction: Boolean(a.freeAttraction),
    address,
    lat: a.center?.latitude ?? null,
    lng: a.center?.longitude ?? null,
    bookingUrl,
  };
}

/**
 * Attrazioni Viator per destinazione (+ filtro testo opzionale via freetext).
 * Non usa viatorUniqueContent (no-index / certificazione partner).
 * `start` = indice 1-based Viator (1, 31, 61…).
 */
export async function searchViatorAttractions(params: {
  city: string;
  query?: string;
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
    30
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
    if (!query && !city) return emptyPage;
    const ft = await viatorFetch<FreetextAttractions>('/search/freetext', {
      method: 'POST',
      body: JSON.stringify({
        searchTerm: query || city,
        searchTypes: [
          {
            searchType: 'ATTRACTIONS',
            pagination: { start, count: pageSize },
          },
        ],
        currency: 'EUR',
      }),
      timeoutMs: 18_000,
    });
    const mapped =
      ft.attractions?.results?.map((r) =>
        mapAttraction({
          attractionId: r.id,
          name: r.name,
          description: r.description,
          productCount: r.productsCount,
          images: r.images,
          reviews: r.reviews,
        })
      ) ?? [];
    const results = mapped.filter((x): x is AttractionHit => x != null);
    const nextStart = start + pageSize;
    const hasMore =
      results.length >= pageSize && nextStart <= 30 * 5;
    return {
      results,
      destinationName: null,
      totalCount: null,
      nextStart: hasMore ? nextStart : null,
      hasMore,
    };
  }

  // Catalogo destinazione
  const data = await viatorFetch<AttractionsSearchResponse>('/attractions/search', {
    method: 'POST',
    body: JSON.stringify({
      destinationId: Number(dest.id),
      sorting: { sort: 'DEFAULT' },
      pagination: { start, count: pageSize },
    }),
    timeoutMs: 18_000,
  });

  let results = (data.attractions ?? [])
    .map(mapAttraction)
    .filter((x): x is AttractionHit => x != null);
  const totalCount =
    typeof data.totalCount === 'number' ? data.totalCount : null;

  // Affina con query testo (solo sulla pagina corrente; freetext se pochi match)
  if (query) {
    const q = query.toLowerCase();
    const filtered = results.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        (r.address?.toLowerCase().includes(q) ?? false)
    );
    if (filtered.length >= 3 || start > 1) {
      results = filtered;
    } else {
      const ft = await viatorFetch<FreetextAttractions>('/search/freetext', {
        method: 'POST',
        body: JSON.stringify({
          searchTerm: query,
          searchTypes: [
            {
              searchType: 'ATTRACTIONS',
              pagination: { start, count: pageSize },
            },
          ],
          currency: 'EUR',
        }),
        timeoutMs: 15_000,
      });
      const fromFt =
        ft.attractions?.results?.map((r) =>
          mapAttraction({
            attractionId: r.id,
            name: r.name,
            description: r.description,
            productCount: r.productsCount,
            images: r.images,
            reviews: r.reviews,
          })
        ) ?? [];
      const merged = new Map<string, AttractionHit>();
      for (const hit of [
        ...filtered,
        ...fromFt.filter((x): x is AttractionHit => x != null),
      ]) {
        merged.set(hit.id, hit);
      }
      results = [...merged.values()];
    }
  }

  const nextStart = start + pageSize;
  const hasMore =
    results.length > 0 &&
    (totalCount != null
      ? nextStart <= totalCount
      : results.length >= pageSize) &&
    nextStart <= 30 * 5;

  return {
    results,
    destinationName: dest.name,
    totalCount,
    nextStart: hasMore ? nextStart : null,
    hasMore,
  };
}
