import { describe, expect, it } from 'vitest';
import {
  airportPromptLabel,
  checkDestinationPlannable,
  resolveDestinationContext,
} from '@/lib/composer/destination-context';

describe('resolveDestinationContext', () => {
  it('resolves a real airport for a known city', () => {
    const ctx = resolveDestinationContext('Sydney, Australia', {
      label: 'Sydney',
      lat: -33.87,
      lng: 151.21,
      country: 'Australia',
      countryCode: 'AU',
      placeType: 'city',
    });

    expect(ctx.isVague).toBe(false);
    expect(ctx.cityLabel).toBe('Sydney');
    expect(ctx.airport?.iata).toBe('SYD');
    expect(ctx.airport?.label).toContain('SYD');
    expect(airportPromptLabel(ctx)).not.toMatch(/più vicino/i);
  });

  it('flags a country-only destination and proposes a hub', () => {
    const ctx = resolveDestinationContext('Australia');

    expect(ctx.isVague).toBe(true);
    expect(ctx.hubSuggestions[0]).toBe('Sydney');
    expect(ctx.fallbackHub?.iata).toBe('SYD');
    // Ripiego esplicito sull'hub: mai il nome del paese come "città"
    expect(ctx.cityLabel).toBe('Sydney');
  });

  it('flags country placeType coming from Nominatim', () => {
    const ctx = resolveDestinationContext('Giappone', {
      label: 'Giappone',
      lat: 36.2,
      lng: 138.2,
      country: 'Giappone',
      countryCode: 'JP',
      placeType: 'country',
    });

    expect(ctx.isVague).toBe(true);
    expect(ctx.fallbackHub?.city).toBe('Tokyo');
  });

  it('keeps regions plannable when they map to a real airport', () => {
    const ctx = resolveDestinationContext('Sicilia, Italia', {
      label: 'Sicilia',
      lat: 37.6,
      lng: 14.0,
      country: 'Italia',
      countryCode: 'IT',
      placeType: 'state',
    });

    expect(ctx.isVague).toBe(false);
    expect(ctx.airport?.iata).toBe('CTA');
  });

  it('returns no airport instead of inventing one', () => {
    const ctx = resolveDestinationContext('Villaggio remoto, Nowhereland', {
      label: 'Villaggio remoto',
      lat: 1,
      lng: 1,
      country: 'Nowhereland',
      countryCode: 'ZZ',
      placeType: 'village',
    });

    expect(ctx.airport).toBeNull();
    expect(airportPromptLabel(ctx)).toBe('Villaggio remoto (aeroporto da confermare)');
  });
});

describe('checkDestinationPlannable', () => {
  it('allows a city destination', () => {
    const ctx = resolveDestinationContext('Barcellona, Spagna', {
      label: 'Barcellona',
      lat: 41.38,
      lng: 2.17,
      countryCode: 'ES',
      placeType: 'city',
    });

    expect(checkDestinationPlannable(ctx)).toEqual({ ok: true });
  });

  it('warns (but proceeds) when falling back to a country hub', () => {
    const check = checkDestinationPlannable(resolveDestinationContext('Australia'));

    expect(check.ok).toBe(true);
    expect(check.ok && check.warning).toContain('Sydney');
  });

  it('blocks a country with no known hub, in Italian', () => {
    const check = checkDestinationPlannable(resolveDestinationContext('Nigeria'));

    expect(check.ok).toBe(false);
    expect(check.ok === false && check.message).toMatch(/scegli una citt/i);
  });

  it('warns when the arrival airport is unknown', () => {
    const check = checkDestinationPlannable(
      resolveDestinationContext('Villaggio remoto, Nowhereland', {
        label: 'Villaggio remoto',
        lat: 1,
        lng: 1,
        countryCode: 'ZZ',
        placeType: 'village',
      })
    );

    expect(check.ok).toBe(true);
    expect(check.ok && check.warning).toMatch(/aeroporto/i);
  });
});
