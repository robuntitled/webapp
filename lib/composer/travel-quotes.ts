import 'server-only';

import {
  buildTripFlightSearchUrl,
  buildTripHotelSearchUrl,
} from '@/lib/travelpayouts/flight-search';
import { fetchCheapestFlightQuote } from '@/lib/travelpayouts/data-api';
import type { ComposerTravelQuotes } from '@/types/composer';

async function fetchTravelQuotesInternal(params: {
  destination: string;
  startDate: string;
  endDate: string;
  tripId?: string;
}): Promise<{ quotes: ComposerTravelQuotes; warnings: string[] }> {
  const warnings: string[] = [];
  const quotes: ComposerTravelQuotes = {};

  const [flightQuote, flightUrl, hotelUrl] = await Promise.all([
    fetchCheapestFlightQuote({
      destination: params.destination,
      startDate: params.startDate,
      endDate: params.endDate,
    }).catch(() => null),
    Promise.resolve(
      buildTripFlightSearchUrl({
        destination: params.destination,
        startDate: params.startDate,
        endDate: params.endDate,
        tripId: params.tripId,
        subId: params.tripId ? `trip_${params.tripId}_voli` : 'composer_voli',
      })
    ),
    Promise.resolve(
      buildTripHotelSearchUrl(params.tripId, {
        destination: params.destination,
        startDate: params.startDate,
        endDate: params.endDate,
      })
    ),
  ]);

  if (flightQuote) {
    quotes.flight = {
      price: flightQuote.price,
      currency: flightQuote.currency,
      origin: flightQuote.origin,
      destination: flightQuote.destination,
      airline: flightQuote.airline,
      affiliateUrl: flightUrl,
      fromCache: true,
    };
  } else if (flightUrl) {
    warnings.push('Prezzo volo non in cache — link affiliate disponibile');
    quotes.flight = {
      price: 0,
      currency: 'EUR',
      origin: 'ROM',
      destination: params.destination,
      airline: null,
      affiliateUrl: flightUrl,
      fromCache: false,
    };
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
  return blocks.map((block) => {
    if (block.type === 'flight' && quotes.flight) {
      const q = quotes.flight;
      return {
        ...block,
        content: {
          ...block.content,
          title:
            q.price > 0
              ? `Volo ${q.origin} → ${q.destination}`
              : block.content.title,
          price: q.price > 0 ? q.price : (block.content.price as number | null) ?? null,
          currency: q.currency,
          airline: q.airline ?? block.content.airline,
          origin: q.origin,
          destination: q.destination,
          affiliateUrl: q.affiliateUrl ?? null,
        },
      };
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