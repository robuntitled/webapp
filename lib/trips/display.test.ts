import { describe, expect, it } from 'vitest';
import {
  formatSpotsLabel,
  getParticipantCount,
  getSpotsLeft,
  isDiscoverableSoloTrip,
  isTripCreator,
  isTripFull,
  resolvePlanningMode,
} from '@/lib/trips/display';
import type { TripWithRelations } from '@/types/trip';

const soloTrip = {
  id: '1',
  title: 'Grecia',
  destination: 'Grecia',
  price: 100,
  maxParticipants: 4,
  planningMode: 'solo',
  creator_id: 'creator-1',
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
    expect(isTripFull(0, 1)).toBe(false);
  });

  it('resolves missing planning mode as solo (open)', () => {
    expect(resolvePlanningMode({ ...soloTrip, planningMode: undefined })).toBe('solo');
    expect(resolvePlanningMode({ ...soloTrip, planningMode: 'group' })).toBe('group');
  });

  it('detects creator via creator_id fallback', () => {
    const withoutJoin = {
      ...soloTrip,
      creator: null,
      creator_id: 'creator-1',
    } as TripWithRelations;
    expect(isTripCreator(withoutJoin, 'creator-1')).toBe(true);
    expect(isTripCreator(withoutJoin, 'other')).toBe(false);
  });

  it('shows solo trips to guests and other users, not the creator', () => {
    expect(isDiscoverableSoloTrip(soloTrip, undefined)).toBe(true);
    expect(isDiscoverableSoloTrip(soloTrip, 'other-user')).toBe(true);
    expect(isDiscoverableSoloTrip(soloTrip, 'creator-1')).toBe(false);
  });
});
