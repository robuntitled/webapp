import { describe, expect, it } from 'vitest';
import { searchPlaceSuggestions } from '@/lib/travel/airport-catalog';

describe('searchPlaceSuggestions', () => {
  it('trova Egitto e aeroporti', () => {
    const hits = searchPlaceSuggestions('egitto', 10);
    expect(hits.some((h) => h.kind === 'country' && h.code === 'EG')).toBe(true);
    expect(hits.some((h) => h.code === 'CAI')).toBe(true);
  });

  it('trova Georgia e Tbilisi', () => {
    const hits = searchPlaceSuggestions('georgia', 10);
    expect(hits.some((h) => h.kind === 'country' && h.code === 'GE')).toBe(true);
    expect(hits.some((h) => h.code === 'TBS')).toBe(true);
  });

  it('trova egypt in inglese', () => {
    const hits = searchPlaceSuggestions('egypt', 10);
    expect(hits.some((h) => h.code === 'EG' || h.code === 'CAI')).toBe(true);
  });

  it('trova Ancona come città', () => {
    const hits = searchPlaceSuggestions('ancona', 10);
    expect(hits.some((h) => h.kind === 'city' && h.label === 'Ancona')).toBe(
      true
    );
  });
});
