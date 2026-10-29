import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authConfig } from '@/auth.config';
import { GDPR_PUBLIC_PATHS, ONBOARDING_PATH } from '@/lib/auth-session';
import { postLoginPath } from '@/lib/onboarding/steps';
import { absoluteUrlOnRequest } from '@/lib/auth/request-origin';

const { auth } = NextAuth(authConfig);

const GDPR_PUBLIC = new Set(GDPR_PUBLIC_PATHS);

function isOnboardingExempt(pathname: string): boolean {
  if (GDPR_PUBLIC.has(pathname)) return true;
  if (pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`)) {
    return true;
  }
  if (pathname.startsWith('/invito/')) return true;
  if (pathname.startsWith('/api')) return true;
  return false;
}

/** Redirect sullo stesso host della richiesta (non AUTH_URL / nextUrl riscritto). */
function redirectOnRequest(req: NextRequest, path: string) {
  return NextResponse.redirect(absoluteUrlOnRequest(path, req.headers, req.nextUrl.origin));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userId = session?.user?.id;
  const privacyOk = Boolean(session?.user?.privacyConsentAccepted);
  const onboardingDone = Boolean(session?.user?.onboardingCompleted);

  // Legacy: auth era su `/` — preserva callback/verify/error/ref verso `/accedi`
  if (pathname === '/' && !userId) {
    const q = req.nextUrl.searchParams;
    if (
      q.has('callbackUrl') ||
      q.has('error') ||
      q.has('verify') ||
      q.has('code') ||
      q.get('mode') === 'register'
    ) {
      const target = absoluteUrlOnRequest('/accedi', req.headers, req.nextUrl.origin);
      q.forEach((value, key) => target.searchParams.set(key, value));
      return NextResponse.redirect(target);
    }
  }

  if (userId && !privacyOk) {
    const isExempt = GDPR_PUBLIC.has(pathname) || pathname.startsWith('/api');
    if (!isExempt) {
      return redirectOnRequest(req, '/completa-registrazione');
    }
  }

  if (pathname === '/completa-registrazione' && userId && privacyOk) {
    return redirectOnRequest(
      req,
      postLoginPath({ onboardingCompleted: onboardingDone })
    );
  }

  if (userId && privacyOk && !onboardingDone && !isOnboardingExempt(pathname)) {
    return redirectOnRequest(req, ONBOARDING_PATH);
  }

  if (pathname === ONBOARDING_PATH && userId && privacyOk && onboardingDone) {
    return redirectOnRequest(req, '/destinazioni');
  }

  // Utenti loggati: home e login → area app (la landing resta per i visitatori)
  if ((pathname === '/' || pathname === '/accedi') && userId && privacyOk) {
    return redirectOnRequest(
      req,
      postLoginPath({ onboardingCompleted: onboardingDone })
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
