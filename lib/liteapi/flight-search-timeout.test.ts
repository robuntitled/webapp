import { describe, expect, it } from 'vitest';
import {
  flightSearchExpectationCopyIt,
  flightSearchTimeoutMs,
  isLiteApiTimeoutError,
} from '@/lib/liteapi/flight-search-timeout';

describe('flightSearchTimeoutMs', () => {
  it('keeps short budget for EU hubs', () => {
    expect(flightSearchTimeoutMs('FCO')).toBe(12_000);
    expect(flightSearchTimeoutMs('LHR')).toBe(12_000);
    expect(flightSearchTimeoutMs('BCN')).toBe(12_000);
  });

  it('extends budget for long-haul destinations like BKK/NRT', () => {
    expect(flightSearchTimeoutMs('BKK')).toBe(28_000);
    expect(flightSearchTimeoutMs('HKT')).toBe(28_000);
    expect(flightSearchTimeoutMs('NRT')).toBe(28_000);
  });

  it('honest expectation copy has no provider names', () => {
    expect(flightSearchExpectationCopyIt('NRT')).toMatch(/20–45/);
    expect(flightSearchExpectationCopyIt('NRT').toLowerCase()).not.toMatch(/provider|liteapi/);
    expect(flightSearchExpectationCopyIt('FCO')).toMatch(/15/);
  });
});

describe('isLiteApiTimeoutError', () => {
  it('detects 504 / timeout messages without importing server client', () => {
    expect(isLiteApiTimeoutError({ status: 504, message: 'Timeout LiteAPI' })).toBe(true);
    expect(isLiteApiTimeoutError({ status: 502, message: 'boom' })).toBe(false);
    expect(isLiteApiTimeoutError(new Error('nope'))).toBe(false);
  });
});
