import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      privacyConsentAccepted: boolean;
    } & DefaultSession['user'];
    privacyConsentAccepted?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    privacyConsentAccepted?: boolean;
    /** Account assente in DB (es. dopo delete) → sessione da trattare come logout */
    invalid?: boolean;
    invalidAt?: number;
    lastUserCheck?: number;
  }
}