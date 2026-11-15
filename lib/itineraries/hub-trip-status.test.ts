import { describe, expect, it } from 'vitest';
import { resolveHubTripBadge } from '@/lib/itineraries/hub-trip-status';
import type { PracticeRow } from '@/lib/itineraries/types';

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
        flight_bookings: [
          {
            bookingId: 'b',
            bookingRef: 'r',
            status: 'PENDING_CONFIRMATION',
            outbound: {
              origin: 'MXP',
              destination: 'IST',
              departureAt: '2026-12-01T10:00:00.000Z',
              arrivalAt: '2026-12-01T14:00:00.000Z',
              airline: null,
            },
            returnLeg: null,
            bookedAt: '2026-11-11T00:00:00.000Z',
          },
        ],
      })
    );
    expect(badge.id).toBe('flightPending');
  });

  it('confirmed → Prenotato', () => {
    const badge = resolveHubTripBadge(
      base({
        flight_confirmed_at: '2026-11-11T00:00:00.000Z',
        flight_booking: {
          bookingId: 'b',
          bookingRef: 'r',
          status: 'CONFIRMED',
          outbound: {
            origin: 'MXP',
            destination: 'IST',
            departureAt: '2026-12-01T10:00:00.000Z',
            arrivalAt: '2026-12-01T14:00:00.000Z',
            airline: null,
          },
          returnLeg: null,
          bookedAt: '2026-11-11T00:00:00.000Z',
        },
      })
    );
    expect(badge.id).toBe('booked');
  });
});
