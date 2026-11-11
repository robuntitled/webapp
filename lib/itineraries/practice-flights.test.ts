import { describe, expect, it } from 'vitest';
import {
  listPracticeFlightBookings,
  prepareFlightBookingPatch,
} from '@/lib/itineraries/practice-flights';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';

function leg(origin: string, destination: string): FlightBookingRecap {
  return {
    bookingId: `b-${origin}-${destination}`,
    bookingRef: `R-${origin}`,
    status: 'CONFIRMED',
    prebookId: `pb-${origin}`,
    transactionId: `tx-${origin}`,
    currency: 'EUR',
    amountEur: 110,
    outbound: {
      origin,
      destination,
      departureAt: '2026-11-16T20:30:00.000Z',
      arrivalAt: '2026-11-17T04:40:00.000Z',
      airline: null,
    },
    returnLeg: null,
    bookedAt: '2026-11-11T12:00:00.000Z',
  };
}

describe('practice flight_bookings multi-leg', () => {
  it('appends a second leg when multiFlightSupported', () => {
    const out = leg('MXP', 'IST');
    const ret = leg('IST', 'MXP');
    const first = prepareFlightBookingPatch(
      { flight_booking: null, flight_bookings: [] },
      out,
      true
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = prepareFlightBookingPatch(
      {
        flight_booking: first.patch.flight_booking,
        flight_bookings: first.patch.flight_bookings ?? [],
      },
      ret,
      true
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.patch.flight_bookings).toHaveLength(2);
    expect(listPracticeFlightBookings({
      flight_booking: second.patch.flight_booking,
      flight_bookings: second.patch.flight_bookings,
    })).toHaveLength(2);
  });

  it('blocks second booking when only singular flight_booking exists', () => {
    const out = leg('MXP', 'IST');
    const ret = leg('IST', 'MXP');
    const second = prepareFlightBookingPatch(
      { flight_booking: out, flight_bookings: null as unknown as undefined },
      ret,
      false
    );
    expect(second.ok).toBe(false);
  });
});
