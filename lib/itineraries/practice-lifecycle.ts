/** Fase utente: interessato → volo prenotato → viaggio attivo → passato */

import { parseFlightStatus } from '@/lib/itineraries/bookings';
import { listPracticeFlightBookings } from '@/lib/itineraries/practice-flights';
import type { PracticeRow } from '@/lib/itineraries/types';

export type PracticeLifecyclePhase = 'interested' | 'booked' | 'active' | 'past';

export function isPastTrip(dateTo: string): boolean {
  return new Date(`${dateTo.slice(0, 10)}T23:59:59`) < new Date();
}

export function isInTrip(dateFrom: string, dateTo: string): boolean {
  const now = new Date();
  const from = new Date(`${dateFrom.slice(0, 10)}T00:00:00`);
  const to = new Date(`${dateTo.slice(0, 10)}T23:59:59`);
  return now >= from && now <= to;
}

/**
 * True only for held/confirmed seats (T1/T2/T3).
 * FAILED bookings must not unlock «Prenotato» / hotel (P0-7).
 */
export function hasFlightBooked(
  p: Pick<PracticeRow, 'flight_confirmed_at' | 'flight_booking' | 'flight_bookings'>
): boolean {
  const bookings = listPracticeFlightBookings(p);
  if (
    bookings.some((b) => {
      const kind = parseFlightStatus(b.status);
      return kind === 'confirmed' || kind === 'pending' || kind === 'needs_review';
    })
  ) {
    return true;
  }
  if (p.flight_confirmed_at && bookings.length === 0) return true;
  return false;
}

export function getPracticeLifecyclePhase(p: PracticeRow): PracticeLifecyclePhase {
  if (!hasFlightBooked(p)) {
    return isPastTrip(p.date_to) ? 'past' : 'interested';
  }
  if (isPastTrip(p.date_to)) return 'past';
  if (isInTrip(p.date_from, p.date_to)) return 'active';
  return 'booked';
}

export const LIFECYCLE_COPY: Record<
  PracticeLifecyclePhase,
  { label: string; description: string; badge: string }
> = {
  interested: {
    label: 'Interessato',
    description: 'Partenza scelta, volo non ancora prenotato',
    badge: 'In valutazione',
  },
  booked: {
    label: 'Volo prenotato',
    description: 'Volo ok — completa hotel e attività prima della partenza',
    badge: 'Prenotato',
  },
  active: {
    label: 'In viaggio',
    description: 'Sei in destinazione — recap e chat del gruppo',
    badge: 'In viaggio',
  },
  past: {
    label: 'Viaggi passati',
    description: 'Partenze già concluse',
    badge: 'Concluso',
  },
};

export type PostFlightStep = 'hotel' | 'sights' | 'done';

export function nextPostFlightStep(
  p: Pick<
    PracticeRow,
    'hotel_confirmed_at' | 'hotel_bookings' | 'activity_confirmed_at' | 'activity_bookings'
  >,
  options?: { hotelsComplete?: boolean }
): PostFlightStep {
  const hotels = p.hotel_bookings ?? [];
  const activities = p.activity_bookings ?? [];
  const hotelDone =
    options?.hotelsComplete ??
    (hotels.length > 0 || Boolean(p.hotel_confirmed_at));
  const activityDone = activities.length > 0 || Boolean(p.activity_confirmed_at);
  if (!hotelDone) return 'hotel';
  if (!activityDone) return 'sights';
  return 'done';
}
