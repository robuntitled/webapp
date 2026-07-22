import { describe, expect, it } from 'vitest';
import { resolveDestinationIata } from '@/lib/travel/iata';

describe('resolveDestinationIata', () => {
  it('resolves italian country names', () => {
    expect(resolveDestinationIata('Thailandia')).toBe('BKK');
    expect(resolveDestinationIata('Giappone')).toBe('TYO');
  });

  it('resolves city in compound destination', () => {
    expect(resolveDestinationIata('Bangkok, Thailandia')).toBe('BKK');
    expect(resolveDestinationIata('Phuket - Thailandia')).toBe('HKT');
  });

  it('accepts raw IATA codes', () => {
    expect(resolveDestinationIata('BCN')).toBe('BCN');
    expect(resolveDestinationIata('bcn')).toBe('BCN');
  });

  it('returns null for unknown destinations', () => {
    expect(resolveDestinationIata('Città sconosciuta')).toBeNull();
  });
});