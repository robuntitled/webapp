import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import { authConfig } from '@/auth.config';
import { authorizeCredentials } from '@/lib/auth-credentials';

const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
const facebookId = process.env.AUTH_FACEBOOK_ID ?? process.env.FACEBOOK_CLIENT_ID;
const facebookSecret =
  process.env.AUTH_FACEBOOK_SECRET ?? process.env.FACEBOOK_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'online',
          response_type: 'code',
        },
      },
    }),
    Facebook({
      clientId: facebookId,
      clientSecret: facebookSecret,
      checks: ['state'],
      authorization: {
        params: {
          scope: 'email public_profile',
        },
      },
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        return authorizeCredentials(
          credentials.email as string,
          credentials.password as string
        );
      },
    }),
  ],
});