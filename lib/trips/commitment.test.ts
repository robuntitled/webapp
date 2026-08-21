import { describe, expect, it } from 'vitest';
import type { TripWithRelations } from '@/types/trip';
import {
  confirmedFlightCount,
  isFlightThresholdMet,
  usesFlightThreshold,
} from '@/lib/trips/commitment';
import { canBookTripServices, formationLabel, isGroupSolid } from '@/lib/trips/formation';

function trip(partial: Partial<TripWithRelations>): TripWithRelations {
  return {
    id: 't1',
    title: 'Grecia',
    destination: 'Grecia',
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
    participantCount: 4,
    trip_participants: [{ user_id: 'c1' }],
    ...partial,
  };
}

describe('flight commitment threshold', () => {
  it('uses flight count for catalog trips', () => {
    const forming = trip({
      templateId: 'grecia-7',
      trip_participants: [
        { user_id: 'a', seatStatus: 'provisional' },
        { user_id: 'b', seatStatus: 'confirmed' },
        { user_id: 'c', seatStatus: 'confirmed' },
        { user_id: 'd', seatStatus: 'provisional' },
      ],
    });
    expect(usesFlightThreshold(forming)).toBe(true);
    expect(confirmedFlightCount(forming)).toBe(2);
    expect(isFlightThresholdMet(forming)).toBe(false);
    expect(canBookTripServices(forming)).toBe(false);
    expect(formationLabel(forming)).toContain('voli 2/4');
  });

  it('unlocks hotel when enough flights confirmed', () => {
    const solid = trip({
      templateId: 'grecia-7',
      trip_participants: Array.from({ length: 4 }, (_, i) => ({
        user_id: `u${i}`,
        seatStatus: 'confirmed' as const,
      })),
    });
    expect(isGroupSolid(solid)).toBe(true);
    expect(canBookTripServices(solid)).toBe(true);
  });

  it('keeps legacy headcount for trips without template', () => {
    const legacy = trip({ participantCount: 2, minParticipants: 4 });
    expect(usesFlightThreshold(legacy)).toBe(false);
    expect(isGroupSolid(legacy)).toBe(false);
  });
});
