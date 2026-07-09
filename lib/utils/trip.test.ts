import { describe, expect, it } from 'vitest';
import { formatAgeRange, formatTripDate, getTripStatus } from '@/lib/utils/trip';

describe('trip utils', () => {
  it('formats age range with open max', () => {
    expect(formatAgeRange(18, 999)).toBe('18+ Anni');
  });

  it('formats age range with bounded max', () => {
    expect(formatAgeRange(26, 35)).toBe('26-35 Anni');
  });

  it('returns upcoming status for future trips', () => {
    const futureStart = new Date();
    futureStart.setDate(futureStart.getDate() + 10);
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 20);

    const status = getTripStatus(futureStart.toISOString(), futureEnd.toISOString());
    expect(status.text).toBe('Prossimamente');
  });

  it('formats trip dates in italian locale', () => {
    const formatted = formatTripDate('2026-12-25');
    expect(formatted).toMatch(/\d{2}/);
  });
});