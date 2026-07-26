import 'server-only';

import { fetchCheapestFlightOffer } from '@/lib/liteapi/flights';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { defaultOriginIata } from '@/lib/travel/origin-iata';
import { collectOrigins, uniqueOriginsByIata } from '@/lib/composer/origins';
import type { ComposerOrigin, ComposerTravelQuotes } from '@/types/composer';

async function fetchFlightQuoteForOrigin(
  origin: ComposerOrigin,
  params: {
    destination: string;
    startDate: string;
    endDate: string;
  }
): Promise<ComposerTravelQuotes['flight'] | null> {
  if (!isLiteApiConfigured()) return null;

  try {
    const offer = await fetchCheapestFlightOffer({
      originIata: origin.iata,
      destination: params.destination,
      departureDate: params.startDate,
      returnDate: params.endDate,
      currency: 'EUR',
    });
    if (!offer) return null;

    return {
      price: offer.price,
      currency: offer.currency,
      origin: offer.origin,
      destination: offer.destination,
      airline: offer.airline,
      affiliateUrl: null,
      fromCache: false,
      originLabel: origin.city,
      role: origin.role,
      offerId: offer.offerId,
    };
  } catch {
    return null;
  }
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

  if (!isLiteApiConfigured()) {
    return {
      quotes,
      warnings: ['LITEAPI_KEY non configurata — quote voli/hotel saltate'],
    };
  }

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

  const flightResults = await Promise.all(
    origins.map((origin) => fetchFlightQuoteForOrigin(origin, params))
  );

  const flights = flightResults.filter((f): f is NonNullable<typeof f> => f != null);
  if (flights.length > 0) {
    quotes.flights = flights;
    quotes.flight = flights.find((f) => f.role === 'organizer') ?? flights[0];
  } else {
    warnings.push('Nessuna tariffa volo per le partenze indicate');
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
  timeoutMs = 8_000
): Promise<{ quotes: ComposerTravelQuotes; warnings: string[] }> {
  const fallback = { quotes: {} as ComposerTravelQuotes, warnings: [] as string[] };

  return Promise.race([
    fetchTravelQuotesInternal(params),
    new Promise<{ quotes: ComposerTravelQuotes; warnings: string[] }>((resolve) => {
      setTimeout(() => {
        resolve({
          quotes: {},
          warnings: ['Ricerca tariffe in timeout — itinerario comunque disponibile'],
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
            offerId: match.offerId ?? null,
            affiliateUrl: null,
          },
        };
      }
    }
    return block;
  });
}
