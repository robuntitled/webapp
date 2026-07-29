import { describe, expect, it, vi } from 'vitest';
import {
  buildGetTransferAffiliateHandoff,
  buildGetTransferSearchUrl,
  wrapTravelpayoutsAffiliateUrl,
} from '@/lib/gettransfer/affiliate-url';

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
  it('wraps target with tp.media marker and subId', () => {
    const target = 'https://gettransfer.com/it/transfers/new?from=A&to=B';
    const out = wrapTravelpayoutsAffiliateUrl(target, '748861', 'prenota_taxi');
    const url = new URL(out);
    expect(url.origin).toBe('https://tp.media');
    expect(url.pathname).toBe('/r');
    expect(url.searchParams.get('marker')).toBe('748861.prenota_taxi');
    expect(url.searchParams.get('p')).toBe(target);
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

  it('wraps with tp.media when marker is set', () => {
    vi.stubEnv('NEXT_PUBLIC_GETTRANSFER_MARKER', '123456');
    const { url, hasAffiliateTracking } = buildGetTransferAffiliateHandoff({
      from: 'Roma',
      to: 'FCO',
    });
    expect(hasAffiliateTracking).toBe(true);
    expect(url).toContain('https://tp.media/r');
    expect(url).toContain('marker=123456');
    expect(url).toContain('prenota_taxi');
  });
});
