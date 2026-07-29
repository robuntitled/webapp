import { describe, expect, it, vi } from 'vitest';
import {
  buildGetTransferAffiliateHandoff,
  buildGetTransferSearchUrl,
  wrapTravelpayoutsAffiliateUrl,
} from '@/lib/gettransfer/affiliate-url';
import { GETTRANSFER_TRAVELPAYOUTS_PROMO_ID } from '@/lib/gettransfer/config';

describe('buildGetTransferSearchUrl', () => {
  it('builds Italian transfer search with from/to and pax', () => {
    const url = new URL(
      buildGetTransferSearchUrl({
        from: 'Roma Termini',
        to: 'Aeroporto Fiumicino',
        adults: 3,
        children: 1,
      })
    );
    expect(url.origin).toBe('https://gettransfer.com');
    expect(url.pathname).toBe('/it/transfers/new');
    expect(url.searchParams.get('from')).toBe('Roma Termini');
    expect(url.searchParams.get('to')).toBe('Aeroporto Fiumicino');
    expect(url.searchParams.get('adults')).toBe('3');
    expect(url.searchParams.get('children')).toBe('1');
  });

  it('adds date_to when date and time are valid', () => {
    const url = new URL(
      buildGetTransferSearchUrl({
        from: 'Milano',
        to: 'Malpensa',
        pickupDate: '2026-08-15',
        pickupTime: '14:30',
      })
    );
    expect(url.searchParams.get('date_to')).toBe('2026-08-15T14:30:00');
  });
});

describe('wrapTravelpayoutsAffiliateUrl', () => {
  it('wraps target with tp.media marker, numeric p, and encoded u', () => {
    const target = 'https://gettransfer.com/it/transfers/new?from=A&to=B';
    const out = wrapTravelpayoutsAffiliateUrl(
      target,
      '748861',
      GETTRANSFER_TRAVELPAYOUTS_PROMO_ID,
      'prenota_taxi'
    );
    const url = new URL(out);
    expect(url.origin).toBe('https://tp.media');
    expect(url.pathname).toBe('/r');
    expect(url.searchParams.get('marker')).toBe('748861.prenota_taxi');
    expect(url.searchParams.get('p')).toBe(String(GETTRANSFER_TRAVELPAYOUTS_PROMO_ID));
    expect(/^\d+$/.test(url.searchParams.get('p')!)).toBe(true);
    expect(url.searchParams.get('u')).toBe(target);
    expect(out).toContain('gettransfer.com');
  });
});

describe('buildGetTransferAffiliateHandoff', () => {
  it('returns bare GetTransfer URL when marker is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_GETTRANSFER_MARKER', '');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_MARKER', '');
    const { url, hasAffiliateTracking } = buildGetTransferAffiliateHandoff({
      from: 'Roma',
      to: 'FCO',
    });
    expect(hasAffiliateTracking).toBe(false);
    expect(url).toContain('gettransfer.com/it/transfers/new');
    expect(url).not.toContain('tp.media');
  });

  it('returns bare GetTransfer URL when promo id is invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_GETTRANSFER_MARKER', '123456');
    vi.stubEnv('NEXT_PUBLIC_GETTRANSFER_PROMO_ID', 'not-a-number');
    const { url, hasAffiliateTracking } = buildGetTransferAffiliateHandoff({
      from: 'Roma',
      to: 'FCO',
    });
    expect(hasAffiliateTracking).toBe(false);
    expect(url).toContain('gettransfer.com/it/transfers/new');
    expect(url).not.toContain('tp.media');
  });

  it('wraps with tp.media when marker and promo id are set', () => {
    vi.stubEnv('NEXT_PUBLIC_GETTRANSFER_MARKER', '123456');
    vi.stubEnv('NEXT_PUBLIC_GETTRANSFER_PROMO_ID', '');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_GETTRANSFER_P', '');
    const { url, hasAffiliateTracking } = buildGetTransferAffiliateHandoff({
      from: 'Roma',
      to: 'FCO',
    });
    expect(hasAffiliateTracking).toBe(true);
    const affiliate = new URL(url);
    expect(affiliate.origin).toBe('https://tp.media');
    expect(affiliate.pathname).toBe('/r');
    expect(affiliate.searchParams.get('marker')).toContain('123456');
    expect(affiliate.searchParams.get('marker')).toContain('prenota_taxi');
    expect(affiliate.searchParams.get('p')).toBe(
      String(GETTRANSFER_TRAVELPAYOUTS_PROMO_ID)
    );
    expect(affiliate.searchParams.get('u')).toContain('gettransfer.com/it/transfers/new');
  });
});
