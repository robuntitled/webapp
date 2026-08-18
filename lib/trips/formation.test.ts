import { describe, expect, it } from 'vitest';
import type { TripWithRelations } from '@/types/trip';
import {
  canBookTripServices,
  departureGuaranteeCopy,
  formationLabel,
  isClosingSoon,
  isGroupSolid,
  lastJoinLabel,
  seatsToMinimum,
} from '@/lib/trips/formation';

function trip(partial: Partial<TripWithRelations>): TripWithRelations {
  return {
    id: 't1',
    title: 'Lisbona',
    destination: 'Lisbona',
    description: '',
    imageUrl: null,
    price: 800,
    startDate: '2026-12-01',
    endDate: '2026-12-08',
    minParticipants: 4,
    maxParticipants: 8,
    minAge: 18,
    maxAge: 999,
    planningMode: 'solo',
    creator: { id: 'c1', first_name: 'Ada', last_name: null, image: null },
    isFavorited: false,
    participantCount: 1,
    trip_participants: [{ user_id: 'c1' }],
    ...partial,
  };
}

describe('trip formation', () => {
  it('keeps bookings locked until the minimum is reached', () => {
    const forming = trip({ participantCount: 1, minParticipants: 4 });
    expect(isGroupSolid(forming)).toBe(false);
    expect(canBookTripServices(forming)).toBe(false);
    expect(seatsToMinimum(forming)).toBe(3);
    expect(formationLabel(forming)).toContain('mancano 3');
  });

  it('unlocks bookings when the group is solid', () => {
    const solid = trip({ participantCount: 4, minParticipants: 4 });
    expect(isGroupSolid(solid)).toBe(true);
    expect(canBookTripServices(solid)).toBe(true);
    expect(departureGuaranteeCopy(solid)).toContain('completo');
  });

  it('treats legacy min=1 trips as already bookable', () => {
    const legacy = trip({ minParticipants: 1, participantCount: 1 });
    expect(canBookTripServices(legacy)).toBe(true);
  });

  it('flags FOMO when few seats remain', () => {
    expect(isClosingSoon(trip({ participantCount: 6, maxParticipants: 8 }))).toBe(true);
    expect(isClosingSoon(trip({ participantCount: 1, maxParticipants: 8 }))).toBe(false);
  });

  it('describes a recent real join', () => {
    const now = new Date('2026-08-17T18:00:00Z');
    const label = lastJoinLabel(
      trip({
        trip_participants: [{ user_id: 'c1', joinedAt: '2026-08-17T17:40:00Z' }],
      }),
      now
    );
    expect(label).toContain('minuti fa');
  });
});
