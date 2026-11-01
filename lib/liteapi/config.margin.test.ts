import { describe, expect, it, vi } from 'vitest';
import { parseLiteApiMargin } from '@/lib/liteapi/config';

describe('parseLiteApiMargin', () => {
  it('defaults to 10 when missing', () => {
    expect(parseLiteApiMargin(null).margin).toBe(10);
    expect(parseLiteApiMargin(null).usedFallback).toBe(true);
  });

  it('flags invalid and zero', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseLiteApiMargin('99').usedFallback).toBe(true);
    expect(parseLiteApiMargin('abc').margin).toBe(10);
    expect(parseLiteApiMargin('0').isZero).toBe(true);
    expect(parseLiteApiMargin('12').margin).toBe(12);
    warn.mockRestore();
  });
});
