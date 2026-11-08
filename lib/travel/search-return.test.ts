import { describe, expect, it } from 'vitest';
import {
  getSearchReturnHref,
  parseSearchReturnReason,
  searchReturnBannerCopy,
} from '@/lib/travel/search-return';

describe('getSearchReturnHref', () => {
  it('torna alla pratica se c’è practiceId', () => {
    expect(getSearchReturnHref('voli', { practiceId: 'p1' })).toBe(
      '/pratica/p1?tab=voli'
    );
    expect(getSearchReturnHref('hotel', { practiceId: 'p1' })).toBe(
      '/pratica/p1?tab=hotel'
    );
  });

  it('torna alla ricerca preservando reason', () => {
    expect(getSearchReturnHref('voli')).toBe('/prenota/voli');
    expect(
      getSearchReturnHref('voli', { reason: 'offer_unavailable' })
    ).toBe('/prenota/voli?reason=offer_unavailable');
    expect(
      getSearchReturnHref('hotel', { reason: 'offer_unavailable' })
    ).toBe('/prenota/hotel?reason=offer_unavailable');
  });
});

describe('parseSearchReturnReason', () => {
  it('accetta solo reason noti', () => {
    expect(parseSearchReturnReason('offer_unavailable')).toBe(
      'offer_unavailable'
    );
    expect(parseSearchReturnReason('nope')).toBeNull();
    expect(parseSearchReturnReason(null)).toBeNull();
  });
});

describe('searchReturnBannerCopy', () => {
  it('spiega offerta non disponibile senza claim di freschezza', () => {
    const copy = searchReturnBannerCopy('offer_unavailable');
    expect(copy).toMatch(/non è più disponibile/i);
    expect(copy).toMatch(/cerca di nuovo/i);
  });
});
