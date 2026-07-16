import { describe, expect, it } from 'vitest';
import {
  formatSpotsLabel,
  getParticipantCount,
  getSpotsLeft,
  isDiscoverableSoloTrip,
  isTripFull,
} from '@/lib/trips/display';
import type { TripWithRelations } from '@/types/trip';

const soloTrip = {
  id: '1',
  title: 'Grecia',
  destination: 'Grecia',
  price: 100,
  maxParticipants: 4,
  planningMode: 'solo',
  creator: { id: 'creator-1', first_name: 'Ada' },
  trip_participants: [{ user_id: 'creator-1', role: 'owner' }],
} as TripWithRelations;

describe('trip display helpers', () => {
  it('counts participants', () => {
    expect(getParticipantCount([{ user_id: 'a' }, { user_id: 'b' }])).toBe(2);
    expect(getParticipantCount(undefined)).toBe(0);
  });

  it('formats spots left', () => {
    expect(formatSpotsLabel(8, 6)).toBe('2 posti liberi');
    expect(formatSpotsLabel(8, 7)).toBe('1 posto libero');
    expect(formatSpotsLabel(8, 8)).toBe('Al completo');
  });

  it('detects full trips', () => {
    expect(isTripFull(4, 4)).toBe(true);
    expect(getSpotsLeft(4, 2)).toBe(2);
  });

  it('shows solo trips to guests and other users, not the creator', () => {
    expect(isDiscoverableSoloTrip(soloTrip, undefined)).toBe(true);
    expect(isDiscoverableSoloTrip(soloTrip, 'other-user')).toBe(true);
    expect(isDiscoverableSoloTrip(soloTrip, 'creator-1')).toBe(false);
  });
});