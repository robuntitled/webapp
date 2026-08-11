import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';
import { GDPR_PUBLIC_PATHS } from '@/lib/auth-session';

const { auth } = NextAuth(authConfig);

const GDPR_PUBLIC = new Set(GDPR_PUBLIC_PATHS);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userId = session?.user?.id;

  // Sessione con token invalid (account cancellato): niente redirect GDPR
  if (userId && !session.user.privacyConsentAccepted) {
    const isExempt =
      GDPR_PUBLIC.has(pathname) || pathname.startsWith('/api');
    if (!isExempt) {
      return NextResponse.redirect(new URL('/completa-registrazione', req.nextUrl));
    }
  }

  if (
    pathname === '/completa-registrazione' &&
    userId &&
    session?.user?.privacyConsentAccepted
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};