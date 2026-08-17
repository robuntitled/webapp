import 'server-only';

import { createAlternativeId } from '@/lib/composer/blocks';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { fetchCheapestFlightOffer, type LiteApiFlightOffer } from '@/lib/liteapi/flights';
import { searchHotelRates, type LiteHotelOffer } from '@/lib/liteapi/hotels';
import {
  searchActivitiesInBounds,
  type ActivityPlaceResult,
} from '@/lib/places/activity-search';
import { searchAffiliateActivities } from '@/lib/activities/search';
import type { ActivityOffer } from '@/lib/activities/types';
import { buildGetTransferAffiliateHandoff } from '@/lib/gettransfer/affiliate-url';
import { withTimeout } from '@/lib/utils/with-timeout';
import type { DestinationContext } from '@/lib/composer/destination-context';
import type {
  ComposerAlternative,
  ComposerBlock,
  ComposerTravelQuotes,
  ComposerTripDayResult,
  ComposerTripEnrichment,
} from '@/types/composer';

export type TripEnrichmentInput = {
  days: ComposerTripDayResult[];
  destination: DestinationContext;
  originIata: string;
  originCity?: string;
  startDate: string;
  endDate: string;
  roundtrip: boolean;
  adults: number;
};

export type TripEnrichmentResult = {
  days: ComposerTripDayResult[];
  warnings: string[];
  quotes: ComposerTravelQuotes;
  enrichment: ComposerTripEnrichment;
};

const FLIGHT_TIMEOUT_MS = 18_000;
const HOTEL_TIMEOUT_MS = 22_000;
const PLACES_TIMEOUT_MS = 12_000;

function isCheckIn(block: ComposerBlock): boolean {
  return block.type === 'hotel' && block.content.hotelPhase !== 'checkout';
}

function isCheckOut(block: ComposerBlock): boolean {
  return block.type === 'hotel' && block.content.hotelPhase === 'checkout';
}

async function safe<T>(
  label: string,
  timeoutMs: number,
  run: () => Promise<T>,
  warnings: string[]
): Promise<T | null> {
  try {
    return await withTimeout(run(), timeoutMs, () => {
      warnings.push(`${label}: ricerca in timeout — blocco lasciato senza prezzo`);
      return null as T;
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'errore';
    warnings.push(`${label}: ${message.slice(0, 90)} — blocco lasciato senza prezzo`);
    return null;
  }
}

function applyFlightOffer(
  days: ComposerTripDayResult[],
  offer: LiteApiFlightOffer,
  input: TripEnrichmentInput
): ComposerTripDayResult[] {
  const firstIndex = days[0]?.dayIndex;
  const lastIndex = days[days.length - 1]?.dayIndex;

  return days.map((day) => ({
    ...day,
    blocks: day.blocks.map((block) => {
      if (block.type !== 'flight') return block;

      const isReturn =
        block.content.returnLeg === true ||
        (day.dayIndex === lastIndex && day.dayIndex !== firstIndex);

      if (isReturn) {
        if (!offer.hasReturn) return block;
        return {
          ...block,
          content: {
            ...block.content,
            title: `Volo ${offer.returnOrigin ?? offer.destination} → ${offer.returnDestination ?? offer.origin}`,
            origin: offer.returnOrigin ?? offer.destination,
            destination: offer.returnDestination ?? offer.origin,
            airline: offer.returnAirline ?? offer.airline,
            flightNumber: offer.returnFlightNumber,
            departureTime: offer.returnDepartureAt,
            arrivalTime: offer.returnArrivalAt,
            // Il prezzo è del biglietto A/R: sta sul volo di andata
            price: null,
            currency: offer.currency,
            includedInRoundTrip: true,
            offerId: offer.offerId,
            needsAirport: false,
            provider: 'liteapi',
            bookable: true,
            source: 'liteapi',
          },
        };
      }

      if (day.dayIndex !== firstIndex) return block;

      return {
        ...block,
        content: {
          ...block.content,
          title: `Volo ${offer.origin} → ${offer.destination}`,
          origin: offer.origin,
          destination: offer.destination,
          originLabel: input.originCity ?? block.content.originLabel,
          airline: offer.airline,
          flightNumber: offer.flightNumber,
          departureTime: offer.departureAt,
          arrivalTime: offer.arrivalAt,
          stops: offer.stops,
          price: offer.price,
          currency: offer.currency,
          offerId: offer.offerId,
          roundTrip: offer.hasReturn,
          needsAirport: false,
          provider: 'liteapi',
          bookable: true,
          source: 'liteapi',
        },
      };
    }),
  }));
}

function hotelAlternatives(offers: LiteHotelOffer[]): ComposerAlternative[] {
  return offers.slice(1, 4).map((offer) => ({
    id: createAlternativeId(),
    label: offer.name,
    price: offer.totalAmount,
    currency: offer.currency,
    notes: [offer.roomName, offer.boardName, offer.refundable ? 'Cancellazione gratuita' : null]
      .filter(Boolean)
      .join(' · '),
    meta: {
      hotelId: offer.hotelId,
      offerId: offer.offerId,
      rateId: offer.rateId,
      lat: offer.lat,
      lng: offer.lng,
      photo: offer.photo,
      stars: offer.stars,
    },
  }));
}

function applyHotelOffers(
  days: ComposerTripDayResult[],
  offers: LiteHotelOffer[],
  nights: number
): ComposerTripDayResult[] {
  const best = offers[0];
  if (!best) return days;

  const alternatives = hotelAlternatives(offers);
  const shared = {
    title: best.name,
    place: best.address ?? best.city ?? undefined,
    area: best.city ?? undefined,
    lat: best.lat ?? undefined,
    lng: best.lng ?? undefined,
    photoUrl: best.photo ?? undefined,
    stars: best.stars,
    rating: best.rating,
    ratingCount: best.reviewCount,
    hotelId: best.hotelId,
    offerId: best.offerId,
    rateId: best.rateId,
    roomName: best.roomName,
    boardName: best.boardName,
    refundable: best.refundable,
    currency: best.currency,
    nights,
    provider: 'liteapi',
    bookable: true,
    source: 'liteapi',
  };

  return days.map((day) => ({
    ...day,
    blocks: day.blocks.map((block) => {
      if (isCheckIn(block)) {
        return {
          ...block,
          content: {
            ...block.content,
            ...shared,
            // Totale soggiorno: sul check-in, non duplicato sul check-out
            price: best.totalAmount,
          },
          alternatives,
        };
      }
      if (isCheckOut(block)) {
        return {
          ...block,
          content: { ...block.content, ...shared, price: null },
        };
      }
      return block;
    }),
  }));
}

type PlaceHit = {
  label: string;
  subtitle: string;
  lat: number;
  lng: number;
  placeId: string;
  rating?: number | null;
  ratingCount?: number | null;
  photoUrl?: string | null;
};

function toPlaceHits(results: ActivityPlaceResult[] | undefined): PlaceHit[] {
  return (results ?? [])
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.label)
    .map((r) => ({
      label: r.label,
      subtitle: r.subtitle,
      lat: r.lat,
      lng: r.lng,
      placeId: r.id,
      rating: r.rating ?? null,
      ratingCount: r.ratingCount ?? null,
      photoUrl: r.photoUrl ?? null,
    }));
}

/** Sostituisce i titoli generici con luoghi reali vicino alla destinazione. */
function applyPlaces(
  days: ComposerTripDayResult[],
  attractions: PlaceHit[],
  meals: PlaceHit[]
): { days: ComposerTripDayResult[]; used: number } {
  let attractionCursor = 0;
  let mealCursor = 0;
  let used = 0;

  const next = days.map((day) => ({
    ...day,
    blocks: day.blocks.map((block) => {
      const hasCoords =
        typeof block.content.lat === 'number' && typeof block.content.lng === 'number';
      if (hasCoords) return block;

      if ((block.type === 'attraction' || block.type === 'activity') && attractions.length > 0) {
        const hit = attractions[attractionCursor % attractions.length];
        attractionCursor += 1;
        used += 1;
        return {
          ...block,
          content: {
            ...block.content,
            title: hit.label,
            place: hit.subtitle || hit.label,
            lat: hit.lat,
            lng: hit.lng,
            placeId: hit.placeId,
            rating: hit.rating ?? null,
            ratingCount: hit.ratingCount ?? null,
            photoUrl: hit.photoUrl ?? undefined,
            provider: 'google',
            bookable: false,
            source: 'google_places',
          },
        };
      }

      if (block.type === 'meal' && meals.length > 0) {
        const hit = meals[mealCursor % meals.length];
        mealCursor += 1;
        used += 1;
        return {
          ...block,
          content: {
            ...block.content,
            title: hit.label,
            place: hit.subtitle || hit.label,
            lat: hit.lat,
            lng: hit.lng,
            placeId: hit.placeId,
            rating: hit.rating ?? null,
            ratingCount: hit.ratingCount ?? null,
            photoUrl: hit.photoUrl ?? undefined,
            provider: 'google',
            bookable: false,
            source: 'google_places',
          },
        };
      }

      return block;
    }),
  }));

  return { days: next, used };
}

function applyViatorActivities(
  days: ComposerTripDayResult[],
  offers: ActivityOffer[]
): { days: ComposerTripDayResult[]; used: number } {
  if (!offers.length) return { days, used: 0 };
  let cursor = 0;
  let used = 0;
  const next = days.map((day) => ({
    ...day,
    blocks: day.blocks.map((block) => {
      if (block.type !== 'activity' || cursor >= offers.length) return block;
      const existingCode = block.content.productCode;
      if (typeof existingCode === 'string' && existingCode) return block;
      const offer = offers[cursor];
      cursor += 1;
      used += 1;
      const code = offer.id.replace(/^viator:/, '');
      return {
        ...block,
        content: {
          ...block.content,
          title: offer.title,
          place: offer.title,
          lat: offer.lat ?? block.content.lat,
          lng: offer.lng ?? block.content.lng,
          photoUrl: offer.imageUrl ?? undefined,
          price: offer.priceFrom ?? null,
          currency: offer.currency ?? 'EUR',
          rating: offer.rating ?? null,
          productCode: code,
          bookingUrl: offer.bookingUrl,
          provider: 'viator',
          bookable: true,
          source: 'viator',
        },
      };
    }),
  }));
  return { days: next, used };
}

/** Handoff GetTransfer sui trasferimenti aeroporto ↔ città (nessun prezzo inventato). */
function applyTransferHandoff(
  days: ComposerTripDayResult[],
  input: TripEnrichmentInput
): { days: ComposerTripDayResult[]; applied: boolean } {
  const airportLabel = input.destination.airport?.label ?? `${input.destination.cityLabel} aeroporto`;
  let applied = false;

  const next = days.map((day) => ({
    ...day,
    blocks: day.blocks.map((block) => {
      if (block.type !== 'transport') return block;
      const from = typeof block.content.from === 'string' ? block.content.from : airportLabel;
      const to = typeof block.content.to === 'string' ? block.content.to : input.destination.cityLabel;
      if (!from || !to || from === to) return block;

      const handoff = buildGetTransferAffiliateHandoff({
        from,
        to,
        pickupDate: day.date,
        pickupTime: typeof block.content.time === 'string' ? block.content.time : '10:00',
        adults: input.adults,
      });
      applied = true;

      return {
        ...block,
        content: {
          ...block.content,
          bookingUrl: handoff.url,
          bookingProvider: 'gettransfer',
          // Nessun prezzo: la quota reale arriva solo dal partner
          price: block.content.price ?? null,
        },
      };
    }),
  }));

  return { days: next, applied };
}

/**
 * Aggancia i blocchi generati a dati reali (voli/hotel/luoghi).
 * Ogni fase è indipendente: se una fallisce le altre restano valide e il blocco
 * corrispondente resta senza prezzo invece di riceverne uno inventato.
 */
export async function enrichTripDays(
  input: TripEnrichmentInput,
  onProgress?: (label: string) => void
): Promise<TripEnrichmentResult> {
  const warnings: string[] = [];
  const quotes: ComposerTravelQuotes = {};
  const enrichment: ComposerTripEnrichment = {
    flights: false,
    hotels: false,
    activities: false,
    transfers: false,
  };

  const { destination } = input;
  const nights = Math.max(
    1,
    (input.days[input.days.length - 1]?.dayIndex ?? 1) - (input.days[0]?.dayIndex ?? 1)
  );

  const liteApi = isLiteApiConfigured();
  if (!liteApi) {
    warnings.push('LITEAPI_KEY non configurata — nessun prezzo reale per voli e hotel');
  }

  onProgress?.('Cerco voli, hotel e luoghi reali…');

  const [flightOffer, hotelOffers, attractions, meals, viator] = await Promise.all([
    liteApi && destination.airport
      ? safe<LiteApiFlightOffer | null>(
          'Voli',
          FLIGHT_TIMEOUT_MS,
          () =>
            fetchCheapestFlightOffer({
              originIata: input.originIata,
              destination: destination.airport!.iata,
              departureDate: input.startDate,
              returnDate: input.roundtrip ? input.endDate : undefined,
              adults: input.adults,
              currency: 'EUR',
            }),
          warnings
        )
      : Promise.resolve(null),
    liteApi && destination.countryCode
      ? safe<LiteHotelOffer[]>(
          'Hotel',
          HOTEL_TIMEOUT_MS,
          () =>
            searchHotelRates({
              cityName: destination.cityLabel,
              countryCode: destination.countryCode!,
              checkin: input.startDate,
              checkout: input.endDate,
              adults: input.adults,
              currency: 'EUR',
              limit: 20,
            }),
          warnings
        )
      : Promise.resolve(null),
    destination.lat != null && destination.lng != null
      ? safe(
          'Attrazioni',
          PLACES_TIMEOUT_MS,
          () =>
            searchActivitiesInBounds(
              '',
              [{ lat: destination.lat!, lng: destination.lng!, radiusKm: 25 }],
              40,
              'attraction'
            ),
          warnings
        )
      : Promise.resolve(null),
    destination.lat != null && destination.lng != null
      ? safe(
          'Ristoranti',
          PLACES_TIMEOUT_MS,
          () =>
            searchActivitiesInBounds(
              '',
              [{ lat: destination.lat!, lng: destination.lng!, radiusKm: 15 }],
              25,
              'meal'
            ),
          warnings
        )
      : Promise.resolve(null),
    safe(
      'Viator',
      PLACES_TIMEOUT_MS,
      () =>
        searchAffiliateActivities({
          city: destination.cityLabel,
          startDate: input.startDate,
          endDate: input.endDate,
        }),
      warnings
    ),
  ]);

  let days = input.days;

  if (flightOffer) {
    days = applyFlightOffer(days, flightOffer, input);
    enrichment.flights = true;
    quotes.flight = {
      price: flightOffer.price,
      currency: flightOffer.currency,
      origin: flightOffer.origin,
      destination: flightOffer.destination,
      airline: flightOffer.airline,
      offerId: flightOffer.offerId,
      fromCache: false,
      originLabel: input.originCity,
      role: 'organizer',
    };
    quotes.flights = [quotes.flight];
  } else if (liteApi && !destination.airport) {
    warnings.push(
      'Aeroporto di arrivo non risolto — nessuna tariffa volo cercata, completa il blocco a mano'
    );
  } else if (liteApi) {
    warnings.push('Nessuna tariffa volo trovata per queste date — blocco volo senza prezzo');
  }

  if (hotelOffers && hotelOffers.length > 0) {
    days = applyHotelOffers(days, hotelOffers, nights);
    enrichment.hotels = true;
  } else if (liteApi && !destination.countryCode) {
    warnings.push('Paese destinazione sconosciuto — ricerca hotel saltata');
  } else if (liteApi) {
    warnings.push('Nessun hotel disponibile per queste date — check-in senza prezzo');
  }

  const attractionHits = toPlaceHits(attractions?.results);
  const mealHits = toPlaceHits(meals?.results);
  const viatorOffers = viator?.results ?? [];
  if (viatorOffers.length > 0) {
    const appliedViator = applyViatorActivities(days, viatorOffers);
    days = appliedViator.days;
    if (appliedViator.used > 0) enrichment.activities = true;
  }
  if (attractionHits.length > 0 || mealHits.length > 0) {
    const applied = applyPlaces(days, attractionHits, mealHits);
    days = applied.days;
    enrichment.activities = enrichment.activities || applied.used > 0;
  } else if (destination.lat == null || destination.lng == null) {
    warnings.push('Coordinate destinazione assenti — attività non agganciate a luoghi reali');
  }

  const transfers = applyTransferHandoff(days, input);
  days = transfers.days;
  enrichment.transfers = transfers.applied;

  return { days, warnings, quotes, enrichment };
}
