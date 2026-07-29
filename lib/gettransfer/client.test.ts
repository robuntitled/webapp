import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  buildRouteInfoQuery,
  buildRouteInfoUrl,
  getGetTransferApiBaseUrl,
  getTransferFetch,
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

    expect(qs).toContain('points%5B%5D=41.9028%2C12.4964');
    expect(qs).toContain('points%5B%5D=41.8003%2C12.2389');
    expect(qs).toContain('with_prices=true');
    expect(qs).toContain('pax=3');
    expect(qs).toContain('date_to=2026-08-01T10%3A00%3A00');
    expect(qs).toContain('currency=EUR');
    expect(qs).toContain('distance_unit=km');
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
