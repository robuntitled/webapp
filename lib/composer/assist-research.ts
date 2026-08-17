import 'server-only';

import { applyPicksToDays, mergeBookablePicks } from '@/lib/composer/bookable-picks';
import { buildComposerDays } from '@/lib/composer/days';
import { resolveDestinationContext } from '@/lib/composer/destination-context';
import { isLiteApiConfigured } from '@/lib/liteapi/config';
import { searchFlightRates, type LiteApiFlightOffer } from '@/lib/liteapi/flights';
import { searchHotelRates, type LiteHotelOffer } from '@/lib/liteapi/hotels';
import { searchAffiliateActivities } from '@/lib/activities/search';
import { searchActivitiesInBounds } from '@/lib/places/activity-search';
import { withTimeout } from '@/lib/utils/with-timeout';
import type { ComposerBookablePick, ComposerDraft } from '@/types/composer';

export type AssistResearchIntent = 'all' | 'flights' | 'hotels' | 'places' | 'activities';

export type AssistResearchResult = {
  reply: string;
  days?: ComposerDraft['days'];
  bookablePicks: ComposerBookablePick[];
};

const RESEARCH_TIMEOUT_MS = 18_000;

export function isResearchAssistIntent(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    /\b(vol[oi]|aeroporto|hotel|allogg|dormir|must\s*visit|imperdibil|attrazion|attivit[aà]|esperienz|tour|cerca|trova|prenotabil|liteapi|viator|places)\b/.test(
      msg
    ) || /quando aggiungo voli/.test(msg)
  );
}

export function detectResearchIntent(message: string): AssistResearchIntent {
  const msg = message.toLowerCase();
  const wantsFlight = /\b(vol[oi]|aeroporto)\b/.test(msg);
  const wantsHotel = /\b(hotel|allogg|dormir)\b/.test(msg);
  const wantsPlaces = /\b(must\s*visit|imperdibil|attrazion|luogh|places)\b/.test(msg);
  const wantsActivities = /\b(attivit[aà]|esperienz|tour|viator)\b/.test(msg);
  const wantsAll = /\b(tutto|cerca|trova|prenotabil)\b/.test(msg) || /quando aggiungo voli/.test(msg);

  const flags = [wantsFlight, wantsHotel, wantsPlaces, wantsActivities].filter(Boolean).length;
  if (wantsAll || flags === 0 || flags >= 3) return 'all';
  if (wantsFlight && !wantsHotel && !wantsPlaces && !wantsActivities) return 'flights';
  if (wantsHotel && !wantsFlight && !wantsPlaces && !wantsActivities) return 'hotels';
  if (wantsActivities && !wantsFlight && !wantsHotel && !wantsPlaces) return 'activities';
  if (wantsPlaces && !wantsFlight && !wantsHotel && !wantsActivities) return 'places';
  return 'all';
}

async function safe<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await withTimeout(run(), RESEARCH_TIMEOUT_MS, () => null as T);
  } catch {
    return null;
  }
}

function flightPick(offer: LiteApiFlightOffer, adults: number): ComposerBookablePick {
  return {
    id: `flight-${offer.offerId.slice(0, 18)}`,
    kind: 'flight',
    provider: 'liteapi',
    title: `Volo ${offer.origin} → ${offer.destination}`,
    price: offer.price,
    currency: offer.currency,
    offerId: offer.offerId,
    origin: offer.origin,
    destinationIata: offer.destination,
    airline: offer.airline,
    airlineCode: offer.airlineCode,
    airlineLogo: offer.airlineLogo,
    departureAt: offer.departureAt,
    arrivalAt: offer.arrivalAt,
    durationMinutes: offer.durationMinutes,
    stops: offer.stops,
    flightNumber: offer.flightNumber,
    cabinClass: offer.cabinClass,
    hasReturn: offer.hasReturn,
    returnOrigin: offer.returnOrigin,
    returnDestination: offer.returnDestination,
    returnAirline: offer.returnAirline,
    returnAirlineCode: offer.returnAirlineCode,
    returnAirlineLogo: offer.returnAirlineLogo,
    returnDepartureAt: offer.returnDepartureAt,
    returnArrivalAt: offer.returnArrivalAt,
    returnDurationMinutes: offer.returnDurationMinutes,
    returnStops: offer.returnStops,
    returnFlightNumber: offer.returnFlightNumber,
    adults,
  };
}

function hotelPick(
  offer: LiteHotelOffer,
  checkIn: string,
  checkOut: string
): ComposerBookablePick {
  return {
    id: `hotel-${offer.hotelId}`,
    kind: 'hotel',
    provider: 'liteapi',
    title: offer.name,
    lat: offer.lat,
    lng: offer.lng,
    photoUrl: offer.photo,
    price: offer.totalAmount,
    currency: offer.currency,
    hotelId: offer.hotelId,
    offerId: offer.offerId,
    rateId: offer.rateId,
    address: offer.address,
    city: offer.city,
    stars: offer.stars,
    rating: offer.rating,
    roomName: offer.roomName,
    boardName: offer.boardName,
    freeCancellation: offer.freeCancellation || offer.refundable,
    checkIn,
    checkOut,
  };
}

function buildReply(
  dest: string,
  picks: ComposerBookablePick[],
  notes: string[]
): string {
  const flights = picks.filter((p) => p.kind === 'flight').length;
  const hotels = picks.filter((p) => p.kind === 'hotel').length;
  const places = picks.filter((p) => p.kind === 'attraction' && p.provider === 'google').length;
  const activities = picks.filter((p) => p.provider === 'viator').length;
  const parts: string[] = [];
  if (flights) parts.push(`${flights} volo LiteAPI`);
  if (hotels) parts.push(`${hotels} hotel LiteAPI`);
  if (places) parts.push(`${places} must visit (Places)`);
  if (activities) parts.push(`${activities} attività Viator`);
  if (!parts.length) {
    return `Non ho trovato offerte prenotabili per ${dest}. ${notes.join(' ')} Puoi riprovare o aggiungere tappe a mano sulla mappa.`;
  }
  return `Ho cercato su LiteAPI, Google Places e Viator per ${dest} e salvato: ${parts.join(', ')}. Sono sulla mappa (cliccabili) e restano in convalida. In prenotazione, dopo il gruppo formato, si prenotano questi — senza rifare la ricerca. ${notes.join(' ')}`.trim();
}

export async function runAssistResearch(
  draft: Partial<ComposerDraft>,
  message: string
): Promise<AssistResearchResult> {
  const destLabel = draft.destination?.trim();
  if (!destLabel) {
    return {
      reply: 'Prima scegli la meta. Poi cerco voli LiteAPI, hotel, must visit e attività Viator e li salvo sulla mappa.',
      bookablePicks: [],
    };
  }

  const intent = detectResearchIntent(message);
  const ctx = resolveDestinationContext(destLabel, draft.destinationMeta);
  const startDate = draft.startDate?.trim();
  const endDate = draft.endDate?.trim();
  const adults = Math.min(9, Math.max(1, draft.maxParticipants ? 1 : 1));
  const originIata = draft.organizerOrigin?.iata;
  const notes: string[] = [];
  const picks: ComposerBookablePick[] = [];

  const wantFlights = intent === 'all' || intent === 'flights';
  const wantHotels = intent === 'all' || intent === 'hotels';
  const wantPlaces = intent === 'all' || intent === 'places';
  const wantActivities = intent === 'all' || intent === 'activities';

  const liteOk = isLiteApiConfigured();
  if (!liteOk && (wantFlights || wantHotels)) {
    notes.push('LiteAPI non configurata: voli/hotel prenotabili saltati.');
  }
  if ((wantFlights || wantHotels) && (!startDate || !endDate)) {
    notes.push('Servono le date per voli e hotel.');
  }

  const lat = ctx.lat ?? draft.destinationMeta?.lat;
  const lng = ctx.lng ?? draft.destinationMeta?.lng;

  const [flightRes, hotelRes, placeRes, activityRes] = await Promise.all([
    wantFlights && liteOk && startDate
      ? safe(() =>
          searchFlightRates({
            originIata,
            destination: ctx.airport?.iata || destLabel,
            departureDate: startDate,
            returnDate: endDate,
            tripType: endDate ? 'roundtrip' : 'oneway',
            adults,
            currency: 'EUR',
          })
        )
      : Promise.resolve(null),
    wantHotels && liteOk && startDate && endDate && ctx.countryCode
      ? safe(() =>
          searchHotelRates({
            cityName: ctx.cityLabel,
            countryCode: ctx.countryCode!,
            checkin: startDate,
            checkout: endDate,
            adults,
            currency: 'EUR',
            limit: 8,
          })
        )
      : Promise.resolve(null),
    wantPlaces && lat != null && lng != null
      ? safe(() =>
          searchActivitiesInBounds('', [{ lat, lng, radiusKm: 18, label: ctx.cityLabel }], 25, 'attraction')
        )
      : Promise.resolve(null),
    wantActivities
      ? safe(() =>
          searchAffiliateActivities({
            city: ctx.cityLabel,
            startDate,
            endDate,
          })
        )
      : Promise.resolve(null),
  ]);

  const cheapest = flightRes?.offers?.[0];
  if (cheapest) picks.push(flightPick(cheapest, adults));
  else if (wantFlights && liteOk && startDate) notes.push('Nessun volo LiteAPI in questa tratta.');

  const hotels = hotelRes ?? [];
  if (hotels[0]) {
    picks.push(hotelPick(hotels[0], startDate!, endDate!));
    for (const alt of hotels.slice(1, 3)) {
      picks.push(hotelPick(alt, startDate!, endDate!));
    }
  } else if (wantHotels && liteOk && startDate && ctx.countryCode) {
    notes.push('Nessun hotel LiteAPI in queste date.');
  }

  const places = placeRes?.results ?? [];
  places.slice(0, 5).forEach((p, i) => {
    picks.push({
      id: `place-${p.id}`,
      kind: 'attraction',
      provider: 'google',
      title: p.label,
      lat: p.lat,
      lng: p.lng,
      photoUrl: p.photoUrl,
      rating: p.rating,
      placeId: p.id,
      dayIndex: i < 2 ? 2 : 3,
      address: p.subtitle,
    });
  });
  if (wantPlaces && !places.length) {
    notes.push(
      lat == null
        ? 'Manca la geolocalizzazione della meta per i must visit.'
        : 'Nessun must visit da Google Places.'
    );
  }

  const activities = activityRes?.results ?? [];
  activities.slice(0, 4).forEach((a, i) => {
    const code = a.id.replace(/^viator:/, '');
    picks.push({
      id: a.id,
      kind: 'activity',
      provider: 'viator',
      title: a.title,
      lat: a.lat,
      lng: a.lng,
      photoUrl: a.imageUrl,
      price: a.priceFrom,
      currency: a.currency,
      rating: a.rating,
      productCode: code,
      bookingUrl: a.bookingUrl,
      dayIndex: 2 + (i % Math.max(1, (draft.days?.length ?? 3) - 1)),
    });
  });
  if (wantActivities && activityRes?.warnings?.length) {
    notes.push(activityRes.warnings[0] ?? '');
  }

  let days = draft.days?.length
    ? draft.days
    : startDate && endDate
      ? buildComposerDays(startDate, endDate)
      : [];
  if (days.length && picks.length) {
    days = applyPicksToDays(days, picks);
  }

  return {
    reply: buildReply(ctx.cityLabel || destLabel, picks, notes.filter(Boolean)),
    days: days.length ? days : undefined,
    bookablePicks: mergeBookablePicks(draft.bookablePicks, picks),
  };
}
