import { describe, expect, it, afterEach } from 'vitest';
import {
  absoluteUrlOnRequest,
  requestOriginFromHeaders,
  rewriteAuthResponseToRequestHost,
  rewriteAuthUrlToRequestOrigin,
} from '@/lib/auth/request-origin';

afterEach(() => {
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
});

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

describe('rewriteAuthUrlToRequestOrigin', () => {
  it('assolutizza path relativi sull’host corrente', () => {
    expect(
      rewriteAuthUrlToRequestOrigin('/onboarding', 'https://preview.vercel.app')
    ).toBe('https://preview.vercel.app/onboarding');
  });

  it('riscrive AUTH_URL verso l’host corrente', () => {
    expect(
      rewriteAuthUrlToRequestOrigin(
        'https://webapp-bice-six-42.vercel.app/accedi?error=CredentialsSignin',
        'https://preview.vercel.app',
        'https://webapp-bice-six-42.vercel.app'
      )
    ).toBe('https://preview.vercel.app/accedi?error=CredentialsSignin');
  });
});

describe('rewriteAuthResponseToRequestHost', () => {
  it('riscrive Location da AUTH_URL verso l’host corrente', async () => {
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
    const out = await rewriteAuthResponseToRequestHost(req, res);
    expect(out.headers.get('location')).toBe('https://preview.vercel.app/destinazioni');
  });

  it('assolutizza JSON url relativo (fix next-auth/react new URL)', async () => {
    process.env.AUTH_URL = 'https://webapp-bice-six-42.vercel.app';
    const req = new Request('https://preview.vercel.app/api/auth/callback/credentials', {
      headers: {
        'x-forwarded-host': 'preview.vercel.app',
        'x-forwarded-proto': 'https',
      },
    });
    const res = new Response(JSON.stringify({ url: '/onboarding' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    const out = await rewriteAuthResponseToRequestHost(req, res);
    const body = (await out.json()) as { url: string };
    expect(body.url).toBe('https://preview.vercel.app/onboarding');
  });

  it('riscrive JSON url da AUTH_URL verso preview', async () => {
    process.env.AUTH_URL = 'https://webapp-bice-six-42.vercel.app';
    const req = new Request('https://preview.vercel.app/api/auth/callback/credentials', {
      headers: {
        'x-forwarded-host': 'preview.vercel.app',
        'x-forwarded-proto': 'https',
      },
    });
    const res = new Response(
      JSON.stringify({
        url: 'https://webapp-bice-six-42.vercel.app/accedi?error=CredentialsSignin&code=credentials',
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
    const out = await rewriteAuthResponseToRequestHost(req, res);
    const body = (await out.json()) as { url: string };
    expect(body.url).toBe(
      'https://preview.vercel.app/accedi?error=CredentialsSignin&code=credentials'
    );
  });
});
