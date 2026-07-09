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
  }
}