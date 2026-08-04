import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  buildDateTo,
  buildRouteInfoQuery,
  buildRouteInfoUrl,
  getGetTransferApiBaseUrl,
  getTransferFetch,
  isGetTransferSandbox,
  normalizeCountryCodes,
} from '@/lib/gettransfer/client';

describe('getGetTransferApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses gtrbox sandbox when GETTRANSFER_ENV=sandbox', () => {
    vi.stubEnv('GETTRANSFER_API_BASE', '');
    vi.stubEnv('GETTRANSFER_ENV', 'sandbox');
    expect(getGetTransferApiBaseUrl()).toBe('https://gtrbox.org/api');
  });

  it('uses production by default', () => {
    vi.stubEnv('GETTRANSFER_API_BASE', '');
    vi.stubEnv('GETTRANSFER_ENV', '');
    expect(getGetTransferApiBaseUrl()).toBe('https://gettransfer.com/api');
  });

  it('respects GETTRANSFER_API_BASE override', () => {
    vi.stubEnv('GETTRANSFER_API_BASE', 'https://custom.example/api/');
    expect(getGetTransferApiBaseUrl()).toBe('https://custom.example/api');
  });
});

describe('normalizeCountryCodes', () => {
  it('collapses identical codes to one', () => {
    expect(normalizeCountryCodes(['TR', 'tr'])).toEqual(['TR']);
  });

  it('keeps both codes for cross-border routes in from→to order', () => {
    expect(normalizeCountryCodes(['AE', 'OM'])).toEqual(['AE', 'OM']);
  });

  it('drops unknown or malformed codes', () => {
    expect(normalizeCountryCodes([undefined, '', 'ITA', null])).toEqual([]);
    expect(normalizeCountryCodes(['IT', undefined])).toEqual(['IT']);
  });
});

describe('buildRouteInfoQuery', () => {
  it('builds points[] and required params', () => {
    const qs = buildRouteInfoQuery({
      points: [
        { lat: 41.9028, lng: 12.4964 },
        { lat: 41.8003, lng: 12.2389 },
      ],
      pax: 3,
      dateTo: '2026-08-01T10:00:00',
    });

    // Spec: points must be wrapped in parentheses → %28lat%2Clng%29
    expect(qs).toContain('points%5B%5D=%2841.9028%2C12.4964%29');
    expect(qs).toContain('points%5B%5D=%2841.8003%2C12.2389%29');
    expect(qs).toContain('with_prices=true');
    expect(qs).toContain('pax=3');
    expect(qs).toContain('date_to=2026-08-01T10%3A00%3A00');
    expect(qs).toContain('currency=EUR');
    expect(qs).toContain('distance_unit=km');
  });

  it('emits a single countries[] for a domestic route', () => {
    const qs = buildRouteInfoQuery({
      points: [
        { lat: 41.28, lng: 28.72, countryCode: 'TR' },
        { lat: 41.04, lng: 28.98, countryCode: 'TR' },
      ],
      pax: 2,
      dateTo: '2026-08-01T10:00:00',
    });

    expect(qs.match(/countries%5B%5D=/g)).toHaveLength(1);
    expect(qs).toContain('countries%5B%5D=TR');
  });

  it('emits two countries[] in from→to order for cross-border routes', () => {
    const qs = buildRouteInfoQuery({
      points: [
        { lat: 25.204849, lng: 55.270783, countryCode: 'AE' },
        { lat: 23.58803, lng: 58.382944, countryCode: 'OM' },
      ],
      pax: 2,
      dateTo: '2026-08-01T10:00:00',
    });

    expect(qs.indexOf('countries%5B%5D=AE')).toBeLessThan(
      qs.indexOf('countries%5B%5D=OM')
    );
    expect(qs.match(/countries%5B%5D=/g)).toHaveLength(2);
  });

  it('omits countries[] when unknown', () => {
    const qs = buildRouteInfoQuery({
      points: [
        { lat: 41.9028, lng: 12.4964 },
        { lat: 41.8003, lng: 12.2389 },
      ],
      pax: 2,
      dateTo: '2026-08-01T10:00:00',
    });

    expect(qs).not.toContain('countries');
  });
});

describe('buildDateTo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to a naive local datetime', () => {
    vi.stubEnv('GETTRANSFER_DATE_TO_OFFSET', '');
    expect(buildDateTo('2026-07-15', '18:30')).toBe('2026-07-15T18:30:00');
  });

  it('applies an explicit offset override', () => {
    expect(buildDateTo('2026-07-15', '18:30', '+07:00')).toBe(
      '2026-07-15T18:30:00+07:00'
    );
    expect(buildDateTo('2026-07-15', '18:30', '+0700')).toBe(
      '2026-07-15T18:30:00+07:00'
    );
    expect(buildDateTo('2026-07-15', '18:30', 'Z')).toBe('2026-07-15T18:30:00Z');
  });

  it('reads the offset from GETTRANSFER_DATE_TO_OFFSET', () => {
    vi.stubEnv('GETTRANSFER_DATE_TO_OFFSET', '+02:00');
    expect(buildDateTo('2026-07-15', '18:30')).toBe('2026-07-15T18:30:00+02:00');
  });

  it('ignores a malformed offset', () => {
    expect(buildDateTo('2026-07-15', '18:30', 'nonsense')).toBe(
      '2026-07-15T18:30:00'
    );
  });
});

describe('isGetTransferSandbox', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is true for sandbox env and gtrbox base override', () => {
    vi.stubEnv('GETTRANSFER_API_BASE', '');
    vi.stubEnv('GETTRANSFER_ENV', 'sandbox');
    expect(isGetTransferSandbox()).toBe(true);

    vi.stubEnv('GETTRANSFER_ENV', '');
    vi.stubEnv('GETTRANSFER_API_BASE', 'https://gtrbox.org/api');
    expect(isGetTransferSandbox()).toBe(true);
  });

  it('is false in production', () => {
    vi.stubEnv('GETTRANSFER_API_BASE', '');
    vi.stubEnv('GETTRANSFER_ENV', 'live');
    expect(isGetTransferSandbox()).toBe(false);
  });
});

describe('buildRouteInfoUrl', () => {
  it('joins base and path', () => {
    const url = buildRouteInfoUrl('https://gtrbox.org/api', {
      points: [{ lat: 51.47, lng: -0.45 }],
      pax: 2,
      dateTo: '2026-08-01T18:30:00',
    });
    expect(url).toMatch(/^https:\/\/gtrbox\.org\/api\/route_info\?/);
    expect(url).toContain('with_prices=true');
  });
});

describe('getTransferFetch', () => {
  beforeEach(() => {
    vi.stubEnv('GETTRANSFER_ACCESS_TOKEN', 'test-token');
    vi.stubEnv('GETTRANSFER_ENV', 'sandbox');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sends X-ACCESS-TOKEN header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => JSON.stringify({ result: 'success' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getTransferFetch('/route_info?with_prices=true');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      'X-ACCESS-TOKEN': 'test-token',
      Accept: 'application/json',
    });
    expect(fetchMock.mock.calls[0][0]).toContain('gtrbox.org/api/route_info');
  });

  it('throws when token is missing', async () => {
    vi.stubEnv('GETTRANSFER_ACCESS_TOKEN', '');
    await expect(getTransferFetch('/route_info')).rejects.toMatchObject({
      status: 503,
    });
  });
});
