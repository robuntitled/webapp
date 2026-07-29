import { describe, expect, it } from 'vitest';
import { withAffiliateBookingPrefs } from '@/lib/travel/affiliate-deeplink';

const PRODUCT =
  'https://www.viator.com/tours/Rome/Colosseum-Arena-Floor-Tour/d511-2917COLOSSEUM?mcid=42383&pid=P00063937&medium=api&api_version=2.0&campaign=nomadlink';

const ATTRACTION =
  'https://www.viator.com/Rome-attractions/Colosseum/d511-a90?mcid=42383&pid=P00063937&medium=api&api_version=2.0';

describe('withAffiliateBookingPrefs', () => {
  it('keeps the exact product path and affiliate attribution params', () => {
    const out = withAffiliateBookingPrefs(PRODUCT, {
      startDate: '2026-08-15',
      endDate: '2026-08-20',
      adults: 3,
      children: 1,
    });
    const url = new URL(out);
    expect(url.pathname).toBe(
      '/tours/Rome/Colosseum-Arena-Floor-Tour/d511-2917COLOSSEUM'
    );
    expect(url.searchParams.get('pid')).toBe('P00063937');
    expect(url.searchParams.get('mcid')).toBe('42383');
    expect(url.searchParams.get('medium')).toBe('api');
    expect(url.searchParams.get('campaign')).toBe('nomadlink');
  });

  it('forces target_lander=NONE so Viator opens the specific PDP', () => {
    const out = withAffiliateBookingPrefs(PRODUCT, {
      startDate: '2026-08-15',
      adults: 2,
      children: 0,
    });
    expect(new URL(out).searchParams.get('target_lander')).toBe('NONE');
  });

  it('sets travelDate (PDP date picker) and does not fake unsupported pax params', () => {
    const out = withAffiliateBookingPrefs(PRODUCT, {
      startDate: '2026-08-15',
      endDate: '2026-08-20',
      adults: 3,
      children: 2,
    });
    const p = new URL(out).searchParams;
    expect(p.get('travelDate')).toBe('2026-08-15');
    expect(p.get('adults')).toBeNull();
    expect(p.get('children')).toBeNull();
    expect(p.get('travellers-adults')).toBeNull();
    expect(p.get('date')).toBeNull();
  });

  it('works the same for attraction URLs (path preserved)', () => {
    const out = withAffiliateBookingPrefs(ATTRACTION, {
      startDate: '2026-09-01',
      endDate: '2026-09-05',
      adults: 2,
      children: 1,
    });
    const url = new URL(out);
    expect(url.pathname).toBe('/Rome-attractions/Colosseum/d511-a90');
    expect(url.searchParams.get('pid')).toBe('P00063937');
    expect(url.searchParams.get('target_lander')).toBe('NONE');
    expect(url.searchParams.get('travelDate')).toBe('2026-09-01');
  });

  it('ignores invalid dates and leaves non-Viator URLs unchanged', () => {
    const badDate = withAffiliateBookingPrefs(PRODUCT, {
      startDate: '15/08/2026',
      adults: 2,
    });
    expect(new URL(badDate).searchParams.get('travelDate')).toBeNull();
    expect(new URL(badDate).searchParams.get('target_lander')).toBe('NONE');

    const other = 'https://example.com/book?x=1';
    expect(withAffiliateBookingPrefs(other, { startDate: '2026-08-15' })).toBe(
      other
    );
  });
});
