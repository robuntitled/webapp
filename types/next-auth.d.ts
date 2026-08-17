import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      privacyConsentAccepted: boolean;
      onboardingCompleted?: boolean;
      travelIntent?: 'create' | 'book' | null;
    } & DefaultSession['user'];
    privacyConsentAccepted?: boolean;
    onboardingCompleted?: boolean;
    travelIntent?: 'create' | 'book' | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    privacyConsentAccepted?: boolean;
    onboardingCompleted?: boolean;
    travelIntent?: 'create' | 'book' | null;
    /** Account assente in DB (es. dopo delete) → sessione da trattare come logout */
    invalid?: boolean;
    invalidAt?: number;
    lastUserCheck?: number;
  }
}