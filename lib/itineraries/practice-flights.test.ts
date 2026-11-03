import { describe, expect, it } from 'vitest';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';
import { FLIGHT_ALREADY_BOOKED_ERROR } from '@/lib/itineraries/bookings';
import {
  listPracticeFlightBookings,
  prepareFlightBookingPatch,
} from '@/lib/itineraries/practice-flights';

function recap(partial: Partial<FlightBookingRecap>): FlightBookingRecap {
  return {
    bookingId: null,
    bookingRef: null,
    status: 'CONFIRMED',
    outbound: { origin: 'MXP', destination: 'BKK', airline: null },
    returnLeg: null,
    bookedAt: '2026-11-01T10:00:00.000Z',
    ...partial,
  };
}

describe('practice-flights M1 helpers', () => {
  it('lists from flight_bookings when present', () => {
    const a = recap({ bookingId: 'a' });
    const b = recap({ bookingId: 'b', outbound: { origin: 'BKK', destination: 'CNX', airline: null } });
    expect(
      listPracticeFlightBookings({ flight_booking: a, flight_bookings: [a, b] })
    ).toHaveLength(2);
  });

  it('falls back to legacy flight_booking', () => {
    const a = recap({ bookingId: 'a' });
    expect(listPracticeFlightBookings({ flight_booking: a })).toEqual([a]);
  });

  it('blocks second flight when multi not supported (A1)', () => {
    const existing = recap({ bookingId: 'a', prebookId: 'p1' });
    const next = recap({ bookingId: 'b', prebookId: 'p2' });
    const result = prepareFlightBookingPatch(
      { flight_booking: existing },
      next,
      false
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(FLIGHT_ALREADY_BOOKED_ERROR);
  });

  it('appends second flight when multi supported (M1)', () => {
    const existing = recap({ bookingId: 'a', prebookId: 'p1' });
    const next = recap({ bookingId: 'b', prebookId: 'p2' });
    const result = prepareFlightBookingPatch(
      { flight_booking: existing, flight_bookings: [existing] },
      next,
      true
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.flight_bookings).toHaveLength(2);
      expect(result.patch.flight_booking.bookingId).toBe('a');
    }
  });

  it('updates same booking in place', () => {
    const existing = recap({ bookingId: 'a', prebookId: 'p1', status: 'PENDING' });
    const next = recap({ bookingId: 'a', prebookId: 'p1', status: 'CONFIRMED' });
    const result = prepareFlightBookingPatch(
      { flight_booking: existing, flight_bookings: [existing] },
      next,
      true
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.flight_bookings).toHaveLength(1);
      expect(result.patch.flight_booking.status).toBe('CONFIRMED');
    }
  });
});
