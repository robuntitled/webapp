import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Facebook from "next-auth/providers/facebook"
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from "./lib/supabase-admin"

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
    Facebook({ clientId: process.env.FACEBOOK_CLIENT_ID, clientSecret: process.env.FACEBOOK_CLIENT_SECRET }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        
        const { data: user } = await supabaseAdmin.from('users').select('*').eq('email', credentials.email as string).single();
        if (!user || !user.hashedPassword) return null;

        const passwordsMatch = await bcrypt.compare(credentials.password as string, user.hashedPassword);
        if (passwordsMatch) {
          // Ricostruiamo un oggetto 'user' con il nome completo per la sessione
          const userToReturn = { 
            ...user, 
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() 
          };
          return userToReturn;
        }
        
        return null;
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') return true;
      try {
        const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', user.email!).single();
        if (!existingUser && user.name) {
          const nameParts = user.name.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ');
          
          await supabaseAdmin.from('users').insert({ 
            email: user.email, 
            image: user.image,
            first_name: firstName,
            last_name: lastName
          });
        }
        return true;
      } catch (error) { 
        console.error("SignIn Callback Error:", error);
        return false; 
      }
    },
    async jwt({ token, user }) {
      if (!token.email) return token;
      
      const { data: dbUser } = await supabaseAdmin.from('users').select('id, first_name, last_name, image').eq('email', token.email).single();
      if (dbUser) {
        token.id = dbUser.id;
        token.name = `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim();
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
});