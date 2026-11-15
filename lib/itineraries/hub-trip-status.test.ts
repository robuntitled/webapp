import { describe, expect, it } from 'vitest';
import { resolveHubTripBadge } from '@/lib/itineraries/hub-trip-status';
import type { PracticeRow } from '@/lib/itineraries/types';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';

function leg(
  origin: string,
  destination: string,
  status: string,
  bookingId = 'b'
): FlightBookingRecap {
  return {
    bookingId,
    bookingRef: 'r',
    status,
    outbound: {
      origin,
      destination,
      departureAt: '2026-12-01T10:00:00.000Z',
      arrivalAt: '2026-12-01T14:00:00.000Z',
      airline: null,
    },
    returnLeg: null,
    bookedAt: '2026-11-11T00:00:00.000Z',
  };
}

function base(over: Partial<PracticeRow> = {}): PracticeRow {
  return {
    id: 'p1',
    user_id: 'u1',
    template_id: 'tpl',
    edition_id: null,
    mode: 'solo',
    date_from: '2026-12-01',
    date_to: '2026-12-10',
    status: 'draft',
    flight_confirmed_at: null,
    hotel_confirmed_at: null,
    activity_confirmed_at: null,
    ...over,
  };
}

describe('resolveHubTripBadge', () => {
  it('draft → Bozza', () => {
    expect(resolveHubTripBadge(base()).id).toBe('draft');
  });

  it('pending → Volo in conferma', () => {
    const badge = resolveHubTripBadge(
      base({
        status: 'confirmed',
        flight_bookings: [leg('MXP', 'IST', 'PENDING_CONFIRMATION')],
      })
    );
    expect(badge.id).toBe('flightPending');
  });

  it('confirmed → Prenotato', () => {
    const badge = resolveHubTripBadge(
      base({
        flight_confirmed_at: '2026-11-11T00:00:00.000Z',
        flight_booking: leg('MXP', 'IST', 'CONFIRMED'),
      })
    );
    expect(badge.id).toBe('booked');
    expect(badge.statusTone).toBe('ok');
  });

  it('FAILED never → Prenotato (P0-7)', () => {
    const badge = resolveHubTripBadge(
      base({
        status: 'confirmed',
        flight_confirmed_at: '2026-11-11T00:00:00.000Z',
        flight_bookings: [leg('MXP', 'BKK', 'FAILED')],
      })
    );
    expect(badge.id).toBe('failed');
    expect(badge.label).not.toMatch(/Prenotato/i);
    expect(badge.statusTone).toBe('err');
  });

  it('needs_review → Da verificare', () => {
    const badge = resolveHubTripBadge(
      base({
        flight_bookings: [leg('MXP', 'BKK', 'NEEDS_REVIEW')],
      })
    );
    expect(badge.id).toBe('needsReview');
    expect(badge.label).toBe('Da verificare');
    expect(badge.statusTone).toBe('warn');
  });

  it('some legs booked → Prenotato in parte', () => {
    const badge = resolveHubTripBadge(
      base({
        selected_flight_plan: {
          version: 2,
          travelers: 1,
          returnHome: true,
          savedAt: '2026-11-11T00:00:00.000Z',
          priceMode: 'unit',
          legs: [
            {
              id: 'out',
              kind: 'outbound',
              originIata: 'MXP',
              destinationIata: 'BKK',
              date: '2026-12-01',
              labelIt: 'Andata',
              offerId: 'o1',
              price: 400,
              currency: 'EUR',
              stops: 0,
              durationMinutes: 600,
              airline: 'X',
              departureAt: null,
              arrivalAt: null,
            },
            {
              id: 'ret',
              kind: 'return',
              originIata: 'BKK',
              destinationIata: 'MXP',
              date: '2026-12-10',
              labelIt: 'Ritorno',
              offerId: 'o2',
              price: 400,
              currency: 'EUR',
              stops: 0,
              durationMinutes: 600,
              airline: 'X',
              departureAt: null,
              arrivalAt: null,
            },
          ],
        },
        flight_bookings: [leg('MXP', 'BKK', 'CONFIRMED', 'b1')],
      })
    );
    expect(badge.id).toBe('bookedPartial');
    expect(badge.label).toBe('Prenotato in parte: 1 di 2 voli');
    expect(badge.statusTone).toBe('warn');
  });
});
