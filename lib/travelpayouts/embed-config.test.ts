import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFlightMapEmbedUrl, buildFlightSearchEmbedUrl } from '@/lib/travelpayouts/embed-config';

const ctx = {
  destination: 'Barcellona, Spagna',
  destinationMeta: { label: 'Barcellona', lat: 41.38, lng: 2.17, country: 'Spagna' },
  startDate: '2026-08-01',
  endDate: '2026-08-08',
  originIata: 'ROM',
};

describe('embed-config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null without credentials', () => {
    expect(buildFlightSearchEmbedUrl(ctx)).toBeNull();
  });

  it('builds search embed url with trs and marker', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_TRS_ID', '548437');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_MARKER', '748861');

    const url = buildFlightSearchEmbedUrl(ctx);
    expect(url).toContain('https://tpemd.com/content');
    expect(url).toContain('trs=548437');
    expect(url).toContain('shmarker=748861');
    expect(url).toContain('promo_id=7879');
    expect(url).toContain('origin=ROM');
    expect(url).toContain('depart_date=2026-08-01');
    expect(url).toContain('show_hotels=true');
    expect(url).toContain('locale=it');
  });

  it('builds map embed url with coordinates', () => {
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_TRS_ID', '548437');
    vi.stubEnv('NEXT_PUBLIC_TRAVELPAYOUTS_MARKER', '748861');

    const url = buildFlightMapEmbedUrl(ctx);
    expect(url).toContain('promo_id=4054');
    expect(url).toContain('lat=41.38');
    expect(url).toContain('lng=2.17');
    expect(url).toContain('origin=ROM');
  });
});