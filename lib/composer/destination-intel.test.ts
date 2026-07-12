import { describe, expect, it } from 'vitest';
import { resolveDestinationIntel } from '@/lib/composer/destination-intel';

describe('resolveDestinationIntel', () => {
  it('returns Marche intel for Monte San Giusto', () => {
    const intel = resolveDestinationIntel('Monte San Giusto, Marche, Italia', {
      label: 'Monte San Giusto',
      country: 'Italia',
      countryCode: 'IT',
    });

    expect(intel.region).toBe('Marche');
    expect(intel.nearestAirport.iata).toBe('AOI');
    expect(intel.places.some((p) => p.toLowerCase().includes('monte san giusto'))).toBe(true);
  });
});