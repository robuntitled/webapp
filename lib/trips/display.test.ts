import { describe, expect, it } from 'vitest';
import {
  formatSpotsLabel,
  getParticipantCount,
  getSpotsLeft,
  isTripFull,
} from '@/lib/trips/display';

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
});