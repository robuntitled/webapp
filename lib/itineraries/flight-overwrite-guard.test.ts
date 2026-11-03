import { describe, expect, it } from 'vitest';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';
import {
  FLIGHT_ALREADY_BOOKED_ERROR,
  isSamePracticeFlightBooking,
} from '@/lib/itineraries/bookings';

function recap(partial: Partial<FlightBookingRecap>): FlightBookingRecap {
  return {
    bookingId: null,
    bookingRef: null,
    status: 'CONFIRMED',
    outbound: {
      origin: 'MXP',
      destination: 'BKK',
      airline: null,
    },
    returnLeg: null,
    bookedAt: '2026-11-01T10:00:00.000Z',
    ...partial,
  };
}

describe('A1 flight overwrite guard', () => {
  it('treats same bookingId / prebookId / transactionId as the same flight', () => {
    const a = recap({ bookingId: 'b1', prebookId: 'p1', transactionId: 't1' });
    expect(isSamePracticeFlightBooking(a, recap({ bookingId: 'b1' }))).toBe(true);
    expect(isSamePracticeFlightBooking(a, recap({ prebookId: 'p1' }))).toBe(true);
    expect(isSamePracticeFlightBooking(a, recap({ transactionId: 't1' }))).toBe(true);
  });

  it('rejects a different second flight', () => {
    const existing = recap({ bookingId: 'b1', prebookId: 'p1', transactionId: 't1' });
    const next = recap({ bookingId: 'b2', prebookId: 'p2', transactionId: 't2' });
    expect(isSamePracticeFlightBooking(existing, next)).toBe(false);
  });

  it('exposes a clear Italian block message', () => {
    expect(FLIGHT_ALREADY_BOOKED_ERROR).toMatch(/già un volo/i);
    expect(FLIGHT_ALREADY_BOOKED_ERROR).toMatch(/assistenza/i);
  });
});
