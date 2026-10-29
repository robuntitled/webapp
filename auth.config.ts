import type { NextAuthConfig } from 'next-auth';
import {
  handleOAuthSignIn,
  isJwtInvalid,
  populateJwtToken,
  populateSession,
  PROTECTED_PATHS,
} from '@/lib/auth-session';

export const authConfig = {
  trustHost: true,
  session: {
    strategy: 'jwt',
    // 30 giorni max; invalidazione account è comunque enforced a ogni refresh JWT
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/accedi',
    error: '/accedi',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Richiede user.id valido (token invalid post-delete → non loggato)
      const isLoggedIn = Boolean(auth?.user?.id);
      const isProtected = PROTECTED_PATHS.some((path) =>
        nextUrl.pathname.startsWith(path)
      );
      if (isProtected) return isLoggedIn;
      return true;
    },
    /**
     * Sempre path relativi sicuri. Evita che AUTH_URL (prod) mandi i redirect
     * delle preview su un altro host: Location relativi restano sull'origine corrente.
     */
    async redirect({ url, baseUrl }) {
      const fallback = '/destinazioni';
      const toSafePath = (raw: string): string | null => {
        try {
          const parsed = raw.startsWith('/')
            ? new URL(raw, baseUrl)
            : new URL(raw);
          const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          if (!path.startsWith('/') || path.startsWith('//')) return null;
          if (path.startsWith('/api') || path.startsWith('/_next')) return null;
          return path;
        } catch {
          return null;
        }
      };
      return toSafePath(url) ?? fallback;
    },
    async signIn({ user, account }) {
      return handleOAuthSignIn(user, account);
    },
    async jwt({ token, trigger, session }) {
      // Aggiornamento da client (session.update) dopo GDPR / onboarding
      if (trigger === 'update' && session && !isJwtInvalid(token)) {
        if (session.privacyConsentAccepted !== undefined) {
          token.privacyConsentAccepted = session.privacyConsentAccepted;
        }
        if (session.onboardingCompleted !== undefined) {
          token.onboardingCompleted = session.onboardingCompleted;
        }
        if (session.travelIntent !== undefined) {
          token.travelIntent = session.travelIntent;
        }
        return populateJwtToken(token, { force: true });
      }
      // Login / nuovo token: sync immediato. Poi refresh al massimo ogni JWT_USER_REFRESH_MS.
      return populateJwtToken(token, { force: trigger === 'signIn' });
    },
    async session({ session, token }) {
      return populateSession(session, token);
    },
  },
} satisfies NextAuthConfig;
