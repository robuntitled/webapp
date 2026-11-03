/**
 * Deriva meta e date da un risultato di ricerca volo/hotel (Fase 1).
 * Nessun prezzo inventato: solo campi già presenti nel risultato.
 */

import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { findAirportByIata } from '@/lib/travel/airport-catalog';
import { pickTemplateForTrip } from '@/lib/itineraries/fit';
import { FREE_TRIP_TEMPLATE_ID, type PlannedLeg } from '@/lib/itineraries/free-trip';
import { publishedDestinations } from '@/lib/itineraries/catalog';

const TH_IATA = new Set(['BKK', 'DMK', 'HKT', 'CNX', 'USM', 'UTP', 'HDY', 'KKC', 'CEI']);

export type FlightSearchSeed = {
  origin: string;
  destination: string;
  departureAt?: string | null;
  returnDepartureAt?: string | null;
  returnDestination?: string | null;
  tripType?: 'oneway' | 'roundtrip';
};

export type HotelSearchSeed = {
  city?: string | null;
  checkin: string;
  checkout: string;
};

export type TripDraftFromSearch = {
  /** Null se M2 applicata; altrimenti FREE_TRIP_TEMPLATE_ID o template Thailandia. */
  templateId: string | null;
  dateFrom: string;
  dateTo: string;
  destinationLabel: string;
  destinationIata: string | null;
  destinationSlug: string | null;
  plannedLegs: PlannedLeg[];
  /** True se c'è un itinerario pubblicato collegabile. */
  hasItinerary: boolean;
};

function isoDateFromMaybe(iso?: string | null): string | null {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  if (Number.isFinite(t)) return format(new Date(t), 'yyyy-MM-dd');
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
  return null;
}

function daysBetween(from: string, to: string): number {
  try {
    const n = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
    return Math.max(2, Math.min(60, n));
  } catch {
    return 10;
  }
}

/** Mappa IATA / città → slug destinazione catalogo pubblicata (oggi: thailandia). */
export function resolveDestinationSlugFromIataOrCity(
  iataOrCity: string
): string | null {
  const raw = iataOrCity.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (TH_IATA.has(upper) || /thailand|bangkok|phuket|chiang\s*mai/i.test(raw)) {
    return 'thailandia';
  }
  const airport = /^[A-Z]{3}$/i.test(raw) ? findAirportByIata(raw) : null;
  if (airport) {
    const label = `${airport.city} ${airport.countryLabel}`.toLowerCase();
    if (airport.countryCode === 'TH' || /thailand/.test(label)) return 'thailandia';
    for (const d of publishedDestinations()) {
      if (label.includes(d.name.toLowerCase()) || label.includes(d.slug)) {
        return d.slug;
      }
    }
  }
  const lower = raw.toLowerCase();
  for (const d of publishedDestinations()) {
    if (lower.includes(d.slug) || lower.includes(d.name.toLowerCase())) {
      return d.slug;
    }
  }
  return null;
}

export function destinationLabelFromIata(iata: string): string {
  const airport = findAirportByIata(iata);
  if (!airport) return iata.toUpperCase();
  return airport.countryLabel && airport.countryLabel !== airport.city
    ? `${airport.city}, ${airport.countryLabel}`
    : airport.city;
}

export function buildTripDraftFromFlight(seed: FlightSearchSeed): TripDraftFromSearch {
  const destIata = seed.destination.trim().toUpperCase();
  const originIata = seed.origin.trim().toUpperCase();
  const dateFrom =
    isoDateFromMaybe(seed.departureAt) ?? format(addDays(new Date(), 14), 'yyyy-MM-dd');
  let dateTo: string;
  if (seed.tripType === 'roundtrip' && seed.returnDepartureAt) {
    dateTo =
      isoDateFromMaybe(seed.returnDepartureAt) ??
      format(addDays(parseISO(dateFrom), 9), 'yyyy-MM-dd');
  } else {
    dateTo = format(addDays(parseISO(dateFrom), 9), 'yyyy-MM-dd');
  }
  if (dateTo < dateFrom) {
    dateTo = format(addDays(parseISO(dateFrom), 9), 'yyyy-MM-dd');
  }

  const slug = resolveDestinationSlugFromIataOrCity(destIata);
  const tripDays = daysBetween(dateFrom, dateTo);
  const template = slug ? pickTemplateForTrip(slug, tripDays) : undefined;

  const plannedLegs: PlannedLeg[] = [
    {
      origin: originIata,
      destination: destIata,
      date: dateFrom,
      kind: 'outbound',
    },
  ];
  if (seed.tripType === 'roundtrip') {
    plannedLegs.push({
      origin: destIata,
      destination: (seed.returnDestination ?? originIata).trim().toUpperCase(),
      date: dateTo,
      kind: 'return',
    });
  }

  return {
    templateId: template?.template_id ?? FREE_TRIP_TEMPLATE_ID,
    dateFrom,
    dateTo,
    destinationLabel: template?.destination_name ?? destinationLabelFromIata(destIata),
    destinationIata: destIata,
    destinationSlug: slug,
    plannedLegs,
    hasItinerary: Boolean(template),
  };
}

export function buildTripDraftFromHotel(seed: HotelSearchSeed): TripDraftFromSearch {
  const checkin = seed.checkin.slice(0, 10);
  const checkout = seed.checkout.slice(0, 10);
  const dateFrom = checkin;
  // date_to inclusivo: giorno del checkout (rientro)
  const dateTo = checkout >= checkin ? checkout : checkin;
  const city = seed.city?.trim() || 'Destinazione';
  const slug = resolveDestinationSlugFromIataOrCity(city);
  const tripDays = daysBetween(dateFrom, dateTo);
  const template = slug ? pickTemplateForTrip(slug, Math.max(tripDays, 2)) : undefined;

  return {
    templateId: template?.template_id ?? FREE_TRIP_TEMPLATE_ID,
    dateFrom,
    dateTo,
    destinationLabel: template?.destination_name ?? city,
    destinationIata: null,
    destinationSlug: slug,
    plannedLegs: [],
    hasItinerary: Boolean(template),
  };
}

/** Prefer null template when M2 is live; until then use FREE_TRIP_TEMPLATE_ID. */
export function templateIdForInsert(
  draft: TripDraftFromSearch,
  opts?: { allowNullTemplate?: boolean }
): string | null {
  if (draft.hasItinerary && draft.templateId && draft.templateId !== FREE_TRIP_TEMPLATE_ID) {
    return draft.templateId;
  }
  if (opts?.allowNullTemplate) return null;
  return FREE_TRIP_TEMPLATE_ID;
}
