// middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Il middleware ora usa solo la configurazione "leggera"
export default NextAuth(authConfig).auth;

// Opzionale: Specifica su quali rotte deve girare il middleware
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};