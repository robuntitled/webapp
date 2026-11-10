import { describe, expect, it } from 'vitest';
import {
  markCoverageBooked,
  parseFlightBookingCoverage,
  participantFlightUiStatus,
  uncoveredParticipantIds,
  upsertCoverageSelection,
  coverageStatusLabelIt,
} from '@/lib/itineraries/flight-booking-coverage';

describe('flight-booking-coverage', () => {
  it('parses valid entries and ignores junk', () => {
    const parsed = parseFlightBookingCoverage([
      {
        beneficiaryUserId: 'a',
        coveredByUserId: 'b',
        status: 'covered',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      { beneficiaryUserId: 'x' },
      null,
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.status).toBe('covered');
  });

  it('upserts pending selection without clobbering booked seats', () => {
    const existing = [
      {
        beneficiaryUserId: 'owner',
        coveredByUserId: 'owner',
        status: 'booked' as const,
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const next = upsertCoverageSelection({
      existing,
      bookerUserId: 'owner',
      beneficiaryIds: ['owner', 'marco'],
    });
    expect(next.find((e) => e.beneficiaryUserId === 'owner')!.status).toBe('booked');
    expect(next.find((e) => e.beneficiaryUserId === 'marco')!.status).toBe('pending');
  });

  it('marks covered vs booked after checkout', () => {
    const pending = upsertCoverageSelection({
      existing: [],
      bookerUserId: 'owner',
      beneficiaryIds: ['owner', 'giulia'],
    });
    const booked = markCoverageBooked({
      existing: pending,
      bookerUserId: 'owner',
      beneficiaryIds: ['owner', 'giulia'],
      bookingId: 'bk-1',
    });
    expect(booked.find((e) => e.beneficiaryUserId === 'owner')!.status).toBe('booked');
    expect(booked.find((e) => e.beneficiaryUserId === 'giulia')!.status).toBe('covered');
    expect(uncoveredParticipantIds(['owner', 'giulia', 'marco'], booked)).toEqual([
      'marco',
    ]);
  });

  it('builds Italian UI labels', () => {
    expect(
      coverageStatusLabelIt(
        participantFlightUiStatus({
          userId: 'm',
          selfBooked: false,
          coverage: {
            beneficiaryUserId: 'm',
            coveredByUserId: 'o',
            status: 'covered',
            updatedAt: 'x',
          },
          coveredByName: 'Alex',
        })
      )
    ).toBe('Coperto da Alex');
  });
});
