import { describe, expect, it } from 'vitest';
import { formatEuro, formatEuroExact } from '@/lib/format/euro';

describe('formatEuro', () => {
  it('formats with Italian grouping', () => {
    expect(formatEuro(1330)).toBe('~1.330 €');
    expect(formatEuro(1700, { approx: false })).toBe('1.700 €');
    expect(formatEuroExact(99.5, 'EUR')).toMatch(/99,50/);
  });
});
