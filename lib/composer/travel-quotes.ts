import 'server-only';

import {
  buildTripFlightSearchUrl,
  buildTripHotelSearchUrl,
} from '@/lib/travelpayouts/flight-search';
import { fetchCheapestFlightQuote } from '@/lib/travelpayouts/data-api';
import { defaultOriginIata } from '@/lib/travelpayouts/origin-iata';
import { collectOrigins, uniqueOriginsByIata } from '@/lib/composer/origins';
import type { ComposerOrigin, ComposerTravelQuotes } from '@/types/composer';

async function fetchFlightQuoteForOrigin(
  origin: ComposerOrigin,
  params: {
    destination: string;
    startDate: string;
    endDate: string;
    tripId?: string;
  }
): Promise<ComposerTravelQuotes['flight'] | null> {
  const subSuffix = origin.role === 'organizer' ? 'org' : `crew_${origin.iata}`;
  const [flightQuote, flightUrl] = await Promise.all([
    fetchCheapestFlightQuote({
      destination: params.destination,
      startDate: params.startDate,
      endDate: params.endDate,
      originIata: origin.iata,
    }).catch(() => null),
    Promise.resolve(
      buildTripFlightSearchUrl({
        destination: params.destination,
        startDate: params.startDate,
        endDate: params.endDate,
        originIata: origin.iata,
        tripId: params.tripId,
        subId: params.tripId ? `trip_${params.tripId}_${subSuffix}` : `composer_${subSuffix}`,
      })
    ),
  ]);

  if (flightQuote) {
    return {
      price: flightQuote.price,
      currency: flightQuote.currency,
      origin: flightQuote.origin,
      destination: flightQuote.destination,
      airline: flightQuote.airline,
      affiliateUrl: flightUrl,
      fromCache: true,
      originLabel: origin.city,
      role: origin.role,
    };
  }

  if (flightUrl) {
    return {
      price: 0,
      currency: 'EUR',
      origin: origin.iata,
      destination: params.destination,
      airline: null,
      affiliateUrl: flightUrl,
      fromCache: false,
      originLabel: origin.city,
      role: origin.role,
    };
  }

  return null;
}

async function fetchTravelQuotesInternal(params: {
  destination: string;
  startDate: string;
  endDate: string;
  tripId?: string;
  organizerOrigin?: ComposerOrigin;
  crewOrigins?: ComposerOrigin[];
}): Promise<{ quotes: ComposerTravelQuotes; warnings: string[] }> {
  const warnings: string[] = [];
  const quotes: ComposerTravelQuotes = {};

  const origins =
    params.organizerOrigin || params.crewOrigins?.length
      ? uniqueOriginsByIata(collectOrigins(params))
      : [
          {
            id: 'default',
            label: 'Default',
            city: 'Roma',
            iata: defaultOriginIata(),
            role: 'organizer' as const,
          },
        ];

  const [flightResults, hotelUrl] = await Promise.all([
    Promise.all(origins.map((origin) => fetchFlightQuoteForOrigin(origin, params))),
    Promise.resolve(
      buildTripHotelSearchUrl(params.tripId, {
        destination: params.destination,
        startDate: params.startDate,
        endDate: params.endDate,
      })
    ),
  ]);

  const flights = flightResults.filter((f): f is NonNullable<typeof f> => f != null);
  if (flights.length > 0) {
    quotes.flights = flights;
    quotes.flight = flights.find((f) => f.role === 'organizer') ?? flights[0];
    if (flights.some((f) => f.price === 0)) {
      warnings.push('Alcuni prezzi volo non in cache — link affiliate disponibili');
    }
  } else {
    warnings.push('Link voli non configurato (TRAVELPAYOUTS_MARKER)');
  }

  if (hotelUrl) {
    quotes.hotel = { affiliateUrl: hotelUrl };
  }

  return { quotes, warnings };
}

export async function fetchTravelQuotesForDay(
  params: {
    destination: string;
    startDate: string;
    endDate: string;
    tripId?: string;
    organizerOrigin?: ComposerOrigin;
    crewOrigins?: ComposerOrigin[];
  },
  timeoutMs = 3_500
): Promise<{ quotes: ComposerTravelQuotes; warnings: string[] }> {
  const fallback = { quotes: {} as ComposerTravelQuotes, warnings: [] as string[] };

  return Promise.race([
    fetchTravelQuotesInternal(params),
    new Promise<{ quotes: ComposerTravelQuotes; warnings: string[] }>((resolve) => {
      setTimeout(() => {
        resolve({
          quotes: {},
          warnings: ['Quote travel in timeout — itinerario comunque disponibile'],
        });
      }, timeoutMs);
    }),
  ]).catch(() => ({
    ...fallback,
    warnings: ['Quote travel non disponibili — itinerario comunque generato'],
  }));
}

export function applyQuotesToBlocks(
  blocks: import('@/types/composer').ComposerBlock[],
  quotes: ComposerTravelQuotes
): import('@/types/composer').ComposerBlock[] {
  const flightQuotes = quotes.flights ?? (quotes.flight ? [quotes.flight] : []);
  const usedOrigins = new Set<string>();

  return blocks.map((block) => {
    if (block.type === 'flight' && flightQuotes.length > 0) {
      const blockOrigin = (block.content.origin as string | undefined)?.toUpperCase();
      const match =
        flightQuotes.find(
          (q) => blockOrigin && q.origin.toUpperCase() === blockOrigin && !usedOrigins.has(q.origin)
        ) ??
        flightQuotes.find((q) => q.role === 'organizer' && !usedOrigins.has(q.origin)) ??
        flightQuotes.find((q) => !usedOrigins.has(q.origin));

      if (match) {
        usedOrigins.add(match.origin);
        return {
          ...block,
          content: {
            ...block.content,
            title:
              match.price > 0
                ? `Volo ${match.origin} → ${match.destination}`
                : block.content.title,
            price: match.price > 0 ? match.price : (block.content.price as number | null) ?? null,
            currency: match.currency,
            airline: match.airline ?? block.content.airline,
            origin: match.origin,
            destination: match.destination,
            originLabel: match.originLabel,
            affiliateUrl: match.affiliateUrl ?? null,
          },
        };
      }
    }
    if (block.type === 'hotel' && quotes.hotel?.affiliateUrl) {
      return {
        ...block,
        content: {
          ...block.content,
          affiliateUrl: quotes.hotel.affiliateUrl,
        },
      };
    }
    return block;
  });
}