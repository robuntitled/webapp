import { describe, expect, it } from 'vitest';
import {
  absoluteUrlOnRequest,
  requestOriginFromHeaders,
  rewriteAuthResponseToRequestHost,
} from '@/lib/auth/request-origin';

describe('requestOriginFromHeaders', () => {
  it('preferisce x-forwarded-host sulla preview', () => {
    const headers = new Headers({
      'x-forwarded-host': 'webapp-git-preview.vercel.app',
      'x-forwarded-proto': 'https',
      host: 'localhost:3000',
    });
    expect(requestOriginFromHeaders(headers)).toBe(
      'https://webapp-git-preview.vercel.app'
    );
  });
});

describe('absoluteUrlOnRequest', () => {
  it('costruisce URL sull’host della request', () => {
    const headers = new Headers({
      'x-forwarded-host': 'preview.vercel.app',
      'x-forwarded-proto': 'https',
    });
    expect(absoluteUrlOnRequest('/destinazioni', headers).href).toBe(
      'https://preview.vercel.app/destinazioni'
    );
  });
});

describe('rewriteAuthResponseToRequestHost', () => {
  it('riscrive Location da AUTH_URL verso l’host corrente', () => {
    process.env.AUTH_URL = 'https://webapp-bice-six-42.vercel.app';
    const req = new Request('https://preview.vercel.app/api/auth/callback/credentials', {
      headers: {
        'x-forwarded-host': 'preview.vercel.app',
        'x-forwarded-proto': 'https',
      },
    });
    const res = new Response(null, {
      status: 302,
      headers: {
        Location: 'https://webapp-bice-six-42.vercel.app/destinazioni',
      },
    });
    const out = rewriteAuthResponseToRequestHost(req, res);
    expect(out.headers.get('location')).toBe('https://preview.vercel.app/destinazioni');
    delete process.env.AUTH_URL;
  });
});
