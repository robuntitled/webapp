import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildFlightSearchCode,
  buildTripFlightSearchUrl,
  buildWhiteLabelUrl,
} from '@/lib/travelpayouts/flight-search';

describe('buildFlightSearchCode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds round-trip economy search for one adult', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA', 'ROM');

    const code = buildFlightSearchCode({
      destination: 'Thailandia',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      adults: 1,
    });

    expect(code).toBe('ROM0108BKK15081');
  });

  it('includes travel class and passenger counts', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA', 'MIL');

    const code = buildFlightSearchCode({
      destination: 'Barcellona',
      startDate: '2026-06-10',
      endDate: '2026-06-17',
      adults: 2,
      children: 1,
      travelClass: 'business',
    });

    expect(code).toBe('MIL1006BCN1706c210');
  });
});

describe('buildWhiteLabelUrl', () => {
  it('adds marker and flightSearch query params', () => {
    const url = buildWhiteLabelUrl({
      domain: 'ricerca.nomadlink.com',
      marker: '123456',
      subId: 'trip_abc_voli',
      flightSearch: 'ROM0108BKK15081',
    });

    expect(url).toBe(
      'https://ricerca.nomadlink.com/?marker=123456.trip_abc_voli&flightSearch=ROM0108BKK15081'
    );
  });
});

describe('buildTripFlightSearchUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when marker is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_FLIGHTS_DOMAIN', '');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_MARKER', '');

    expect(
      buildTripFlightSearchUrl({
        destination: 'Roma',
        startDate: '2026-08-01',
        endDate: '2026-08-15',
        tripId: 'trip-1',
      })
    ).toBeNull();
  });

  it('falls back to tp.media affiliate when only marker is set', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_FLIGHTS_DOMAIN', '');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_MARKER', '777');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA', 'ROM');

    const url = buildTripFlightSearchUrl({
      destination: 'Thailandia',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      tripId: 'trip-1',
    });

    expect(url).toContain('tp.media');
    expect(url).toContain('marker=777.trip_trip_1_voli');
  });

  it('builds full white label url when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_FLIGHTS_DOMAIN', 'ricerca.nomadlink.com');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_MARKER', '999');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA', 'ROM');

    const url = buildTripFlightSearchUrl({
      destination: 'Thailandia',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      tripId: 'trip-42',
      adults: 2,
    });

    expect(url).toContain('https://ricerca.nomadlink.com/');
    expect(url).toContain('marker=999.trip_trip_42_voli');
    expect(url).toContain('flightSearch=ROM0108BKK15082');
  });
});