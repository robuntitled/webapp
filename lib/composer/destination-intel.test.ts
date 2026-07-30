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
    expect(intel.nearestAirport?.iata).toBe('AOI');
    expect(intel.places.some((p) => p.toLowerCase().includes('monte san giusto'))).toBe(true);
  });

  it('never falls back to a generic airport placeholder', () => {
    const intel = resolveDestinationIntel('Sydney, Australia', {
      label: 'Sydney',
      country: 'Australia',
      countryCode: 'AU',
    });

    expect(intel.nearestAirport?.iata).toBe('SYD');
    expect(intel.nearestAirport?.label ?? '').not.toMatch(/più vicino/i);
  });

  it('leaves the airport empty when it cannot be resolved', () => {
    const intel = resolveDestinationIntel('Villaggio remoto, Nowhereland', {
      label: 'Villaggio remoto',
      country: 'Nowhereland',
      countryCode: 'ZZ',
    });

    expect(intel.nearestAirport).toBeNull();
  });
});