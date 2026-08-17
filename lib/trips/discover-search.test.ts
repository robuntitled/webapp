import { describe, expect, it } from 'vitest';
import { tripDurationDays, tripMatchesDiscoverFilters } from '@/lib/trips/discover-search';
import type { TripWithRelations } from '@/types/trip';

function trip(partial: Partial<TripWithRelations>): TripWithRelations {
  return {
    id: 't1',
    title: 'Lisbona',
    destination: 'Portogallo',
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
    participantCount: 2,
    trip_participants: [{ user_id: 'c1' }],
    ...partial,
  };
}

const baseFilters = {
  searchTerm: '',
  dateRange: undefined,
  priceRange: [0, 5000] as [number, number],
  duration: 'any' as const,
  status: 'any' as const,
  region: '',
};

describe('discover filters', () => {
  it('counts calendar duration inclusive', () => {
    expect(tripDurationDays(trip({ startDate: '2026-12-01', endDate: '2026-12-08' }))).toBe(8);
  });

  it('keeps week-long trips on the 5–8 filter', () => {
    expect(
      tripMatchesDiscoverFilters(trip({ startDate: '2026-12-01', endDate: '2026-12-08' }), {
        ...baseFilters,
        duration: 'week',
      })
    ).toBe(true);
    expect(
      tripMatchesDiscoverFilters(trip({ startDate: '2026-12-01', endDate: '2026-12-03' }), {
        ...baseFilters,
        duration: 'week',
      })
    ).toBe(false);
  });
});
