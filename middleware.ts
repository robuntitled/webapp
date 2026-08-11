import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';
import { GDPR_PUBLIC_PATHS } from '@/lib/auth-session';
import { POST_LOGIN_PATH, ROUTES } from '@/lib/nav/routes';

const { auth } = NextAuth(authConfig);

const GDPR_PUBLIC = new Set(GDPR_PUBLIC_PATHS);

/** Path che richiedono sessione (guest → login con callback). */
const AUTH_REQUIRED_PREFIXES = [
  ROUTES.hub,
  ROUTES.organizza,
  ROUTES.iMiei,
  ROUTES.messaggi,
  ROUTES.profilo,
  ROUTES.impostazioni,
  ROUTES.preferiti,
  ROUTES.costi,
  ROUTES.prenota,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userId = session?.user?.id;

  // Sessione con token invalid (account cancellato): niente redirect GDPR
  if (userId && !session.user.privacyConsentAccepted) {
    const isExempt =
      GDPR_PUBLIC.has(pathname) || pathname.startsWith('/api');
    if (!isExempt) {
      return NextResponse.redirect(new URL(ROUTES.completaRegistrazione, req.nextUrl));
    }
  }

  if (
    pathname === ROUTES.completaRegistrazione &&
    userId &&
    session?.user?.privacyConsentAccepted
  ) {
    return NextResponse.redirect(new URL(POST_LOGIN_PATH, req.nextUrl));
  }

  // Loggato su home guest → Hub (IA: / = marketing, /hub = home loggata)
  if (pathname === ROUTES.home && userId && session?.user?.privacyConsentAccepted) {
    return NextResponse.redirect(new URL(POST_LOGIN_PATH, req.nextUrl));
  }

  // Guest su aree loggate
  if (!userId) {
    const needsAuth = AUTH_REQUIRED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (needsAuth) {
      const login = new URL(ROUTES.home, req.nextUrl);
      login.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};