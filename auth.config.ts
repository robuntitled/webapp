import type { NextAuthConfig } from 'next-auth';
import {
  handleOAuthSignIn,
  populateJwtToken,
  populateSession,
  PROTECTED_PATHS,
} from '@/lib/auth-session';

export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
    error: '/',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
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
      if (trigger === 'update' && session?.privacyConsentAccepted !== undefined) {
        token.privacyConsentAccepted = session.privacyConsentAccepted;
        return token;
      }
      return populateJwtToken(token);
    },
    async session({ session, token }) {
      return populateSession(session, token);
    },
  },
} satisfies NextAuthConfig;