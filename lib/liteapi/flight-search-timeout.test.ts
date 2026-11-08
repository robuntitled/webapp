import { describe, expect, it } from 'vitest';
import {
  flightSearchTimeoutMs,
  isLiteApiTimeoutError,
} from '@/lib/liteapi/flight-search-timeout';

describe('flightSearchTimeoutMs', () => {
  it('keeps short budget for EU hubs', () => {
    expect(flightSearchTimeoutMs('FCO')).toBe(10_000);
    expect(flightSearchTimeoutMs('LHR')).toBe(10_000);
    expect(flightSearchTimeoutMs('BCN')).toBe(10_000);
  });

  it('extends budget for long-haul destinations like BKK', () => {
    expect(flightSearchTimeoutMs('BKK')).toBe(18_000);
    expect(flightSearchTimeoutMs('HKT')).toBe(18_000);
    expect(flightSearchTimeoutMs('NRT')).toBe(18_000);
  });
});

describe('isLiteApiTimeoutError', () => {
  it('detects 504 / timeout messages without importing server client', () => {
    expect(isLiteApiTimeoutError({ status: 504, message: 'Timeout LiteAPI' })).toBe(true);
    expect(isLiteApiTimeoutError({ status: 502, message: 'boom' })).toBe(false);
    expect(isLiteApiTimeoutError(new Error('nope'))).toBe(false);
  });
});
