import { describe, expect, it } from 'vitest';
import { resolveDestinationIata, resolveFlightDestinationIata } from '@/lib/travel/iata';

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

describe('resolveFlightDestinationIata', () => {
  it('maps Kenya to NBO', () => {
    expect(resolveFlightDestinationIata('Kenya')).toBe('NBO');
    expect(resolveFlightDestinationIata('Nairobi')).toBe('NBO');
  });

  it('maps Paesi Bassi and Cechia via catalog', () => {
    expect(resolveFlightDestinationIata('Paesi Bassi')).toBe('AMS');
    expect(resolveFlightDestinationIata('Cechia')).toBe('PRG');
  });

  it('expands metro TYO to a real airport', () => {
    expect(resolveFlightDestinationIata('TYO')).toBe('HND');
    expect(resolveFlightDestinationIata('Giappone')).toBe('HND');
  });
});