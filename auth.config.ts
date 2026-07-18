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
    signIn: '/',
    error: '/',
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
    async signIn({ user, account }) {
      return handleOAuthSignIn(user, account);
    },
    async jwt({ token, trigger, session }) {
      // Aggiornamento consenso privacy da client (session.update)
      if (trigger === 'update' && session?.privacyConsentAccepted !== undefined) {
        if (isJwtInvalid(token)) {
          return token;
        }
        token.privacyConsentAccepted = session.privacyConsentAccepted;
        // Riconvalida comunque su DB (account potrebbe essere stato cancellato)
        return populateJwtToken(token);
      }
      return populateJwtToken(token);
    },
    async session({ session, token }) {
      return populateSession(session, token);
    },
  },
} satisfies NextAuthConfig;
