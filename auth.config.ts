// auth.config.ts
import type { NextAuthConfig } from 'next-auth';
import Credentials from "next-auth/providers/credentials"
import { supabaseAdmin } from './lib/supabase-admin';
import bcrypt from 'bcryptjs'

export const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    // Per ora lasciamo i provider qui, ma li definiremo nel file principale.
    // Il provider Credentials va definito qui perché la sua logica 'authorize'
    // deve essere accessibile dal middleware.
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        
        const { data: user } = await supabaseAdmin.from('users').select('*').eq('email', credentials.email as string).single();
        if (!user || !user.hashedPassword) return null;

        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.hashedPassword);
        if (passwordsMatch) return user;
        
        return null;
      }
    }),
  ],
  callbacks: {
    // Tutti i callback sono sicuri per il middleware
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true;
      try {
        const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', user.email!).single();
        if (!existingUser) {
          await supabaseAdmin.from('users').insert({ name: user.name, email: user.email, image: user.image });
        }
        return true;
      } catch (error) { return false; }
    },
    async jwt({ token, user }) {
      if (!token.email) return token;
      const { data: dbUser } = await supabaseAdmin.from('users').select('id, name, image').eq('email', token.email).single();
      if (dbUser) {
        token.id = dbUser.id;
        token.name = dbUser.name;
        token.picture = dbUser.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string | null;
        session.user.image = token.picture;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;