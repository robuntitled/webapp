import { describe, expect, it, vi } from 'vitest';
import {
  defaultOriginIata,
  originFromCityLabel,
  resolveOriginIata,
} from '@/lib/travel/origin-iata';

describe('resolveOriginIata', () => {
  it('resolves major Italian cities', () => {
    expect(resolveOriginIata('Milano')).toBe('MIL');
    expect(resolveOriginIata('Roma')).toBe('ROM');
  });

  it('resolves Marche towns to Ancona', () => {
    expect(resolveOriginIata('Monte San Giusto')).toBe('AOI');
    expect(resolveOriginIata('Macerata')).toBe('AOI');
    expect(resolveOriginIata('Pesaro')).toBe('AOI');
  });

  it('returns null for unknown places', () => {
    expect(resolveOriginIata('')).toBeNull();
    expect(resolveOriginIata('xyzunknowntown')).toBeNull();
  });
});

describe('originFromCityLabel', () => {
  it('falls back to default IATA when unknown', () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_ORIGIN_IATA', 'ROM');
    const result = originFromCityLabel('xyzunknowntown');
    expect(result.iata).toBe('ROM');
    expect(result.city).toBe('xyzunknowntown');
  });

  it('uses resolved IATA for known cities', () => {
    const result = originFromCityLabel('Bologna');
    expect(result.iata).toBe('BLQ');
  });
});

describe('defaultOriginIata', () => {
  it('reads env or defaults to ROM', () => {
    vi.stubEnv('NEXT_PUBLIC_DEFAULT_ORIGIN_IATA', 'MIL');
    expect(defaultOriginIata()).toBe('MIL');
  });
});