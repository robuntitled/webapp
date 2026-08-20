import { describe, expect, it } from 'vitest';
import { selectSearchOrigins } from '@/lib/liteapi/flight-origins';

describe('selectSearchOrigins', () => {
  it('caps country fan-out at two hubs', () => {
    expect(
      selectSearchOrigins(['FCO', 'MXP', 'LIN', 'BGY', 'VCE', 'NAP'], { maxOrigins: 2 })
    ).toEqual(['FCO', 'MXP']);
  });

  it('keeps a single airport', () => {
    expect(selectSearchOrigins(['ATH'])).toEqual(['ATH']);
  });
});
