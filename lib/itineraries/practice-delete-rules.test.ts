import { describe, expect, it } from 'vitest';
import { evaluatePracticeDelete } from '@/lib/itineraries/practice-delete-rules';
import type { PracticeRow } from '@/lib/itineraries/types';
import type { FlightBookingRecap } from '@/lib/itineraries/bookings';

function basePractice(over: Partial<PracticeRow> = {}): PracticeRow {
  return {
    id: 'p1',
    user_id: 'u1',
    template_id: 'tpl',
    edition_id: 'e1',
    mode: 'friends',
    date_from: '2026-12-01',
    date_to: '2026-12-10',
    status: 'draft',
    flight_confirmed_at: null,
    hotel_confirmed_at: null,
    activity_confirmed_at: null,
    flight_booking: null,
    flight_bookings: [],
    hotel_bookings: [],
    activity_bookings: [],
    ...over,
  };
}

function flight(status: string, amountEur: number | null = null): FlightBookingRecap {
  return {
    bookingId: 'b1',
    bookingRef: 'R1',
    status,
    amountEur,
    currency: 'EUR',
    outbound: {
      origin: 'MXP',
      destination: 'IST',
      departureAt: '2026-12-01T10:00:00.000Z',
      arrivalAt: '2026-12-01T14:00:00.000Z',
      airline: null,
    },
    returnLeg: null,
    bookedAt: '2026-11-11T12:00:00.000Z',
  };
}

describe('evaluatePracticeDelete', () => {
  it('allows hard delete of empty draft with no other members', () => {
    const r = evaluatePracticeDelete({
      practice: basePractice(),
      isCreator: true,
      otherActiveMemberCount: 0,
      chargeVerifiedNone: true,
    });
    expect(r.canHardDelete).toBe(true);
  });

  it('blocks pending flight (paid) and suggests no delete', () => {
    const r = evaluatePracticeDelete({
      practice: basePractice({
        status: 'confirmed',
        flight_bookings: [flight('PENDING_CONFIRMATION', 110)],
      }),
      isCreator: true,
      otherActiveMemberCount: 0,
      chargeVerifiedNone: false,
    });
    expect(r.canHardDelete).toBe(false);
    expect(r.blockReason).toBe('pending_flight');
  });

  it('blocks failed when charge not verified clear', () => {
    const r = evaluatePracticeDelete({
      practice: basePractice({
        flight_bookings: [flight('FAILED', 110)],
      }),
      isCreator: true,
      otherActiveMemberCount: 0,
      chargeVerifiedNone: false,
    });
    expect(r.canHardDelete).toBe(false);
    expect(r.blockReason).toBe('failed_with_charge');
  });

  it('allows failed only when chargeVerifiedNone and amount empty', () => {
    const r = evaluatePracticeDelete({
      practice: basePractice({
        flight_bookings: [flight('FAILED', null)],
      }),
      isCreator: true,
      otherActiveMemberCount: 0,
      chargeVerifiedNone: true,
    });
    expect(r.canHardDelete).toBe(true);
  });

  it('blocks when hotel paid', () => {
    const r = evaluatePracticeDelete({
      practice: basePractice({
        hotel_bookings: [
          {
            bookingId: 'h1',
            bookingRef: 'H1',
            hotelName: 'Test',
            bookedAt: '2026-11-11T12:00:00.000Z',
          },
        ],
      }),
      isCreator: true,
      otherActiveMemberCount: 0,
      chargeVerifiedNone: true,
    });
    expect(r.canHardDelete).toBe(false);
    expect(r.blockReason).toBe('paid_hotel_or_activity');
  });

  it('with other members: transfer instead of delete', () => {
    const r = evaluatePracticeDelete({
      practice: basePractice(),
      isCreator: true,
      otherActiveMemberCount: 2,
      chargeVerifiedNone: true,
    });
    expect(r.canHardDelete).toBe(false);
    expect(r.shouldTransferAndLeave).toBe(true);
  });

  it('creator leave with others transfers even if paid (Kr #6)', () => {
    const r = evaluatePracticeDelete({
      practice: basePractice({
        status: 'confirmed',
        flight_bookings: [flight('CONFIRMED', 200)],
        flight_confirmed_at: '2026-11-11T00:00:00.000Z',
      }),
      isCreator: true,
      otherActiveMemberCount: 1,
      chargeVerifiedNone: false,
    });
    expect(r.canHardDelete).toBe(false);
    expect(r.shouldTransferAndLeave).toBe(true);
  });
});
