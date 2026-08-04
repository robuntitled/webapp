import { describe, expect, it } from 'vitest';
import {
  MIN_HOURS_AHEAD,
  validatePickupDate,
} from '@/lib/gettransfer/pickup-window';

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-08-01T12:00:00Z');

describe('validatePickupDate', () => {
  it('requires 24 hours of lead time', () => {
    expect(MIN_HOURS_AHEAD).toBe(24);
  });

  it('rejects a pickup less than 24h ahead', () => {
    const dateTo = new Date(NOW + 23 * HOUR).toISOString();
    expect(validatePickupDate(dateTo, NOW)).toContain('24 ore');
  });

  it('accepts a pickup more than 24h ahead', () => {
    const dateTo = new Date(NOW + 25 * HOUR).toISOString();
    expect(validatePickupDate(dateTo, NOW)).toBeNull();
  });

  it('rejects invalid dates', () => {
    expect(validatePickupDate('not-a-date', NOW)).toBe('Data o ora non valida.');
  });
});
