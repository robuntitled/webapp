export type AuthEnvStatus = {
  ok: boolean;
  missing: string[];
  hints: string[];
};

export function getAuthEnvStatus(): AuthEnvStatus {
  const missing: string[] = [];
  const hints: string[] = [];

  if (!process.env.AUTH_SECRET?.trim()) {
    missing.push('AUTH_SECRET');
    hints.push('Genera con: npx auth secret');
  }

  const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!googleId?.trim()) missing.push('GOOGLE_CLIENT_ID');
  if (!googleSecret?.trim()) missing.push('GOOGLE_CLIENT_SECRET');

  const facebookId = process.env.AUTH_FACEBOOK_ID ?? process.env.FACEBOOK_CLIENT_ID;
  const facebookSecret =
    process.env.AUTH_FACEBOOK_SECRET ?? process.env.FACEBOOK_CLIENT_SECRET;
  if (!facebookId?.trim()) missing.push('FACEBOOK_CLIENT_ID');
  if (!facebookSecret?.trim()) missing.push('FACEBOOK_CLIENT_SECRET');

  if (!process.env.AUTH_URL?.trim() && !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    missing.push('AUTH_URL');
    hints.push('Imposta AUTH_URL=https://webapp-bice-six-42.vercel.app su Vercel');
  }

  if (process.env.AUTH_TRUST_HOST !== 'true' && process.env.VERCEL) {
    hints.push('Imposta AUTH_TRUST_HOST=true su Vercel');
  }

  return {
    ok: missing.length === 0,
    missing,
    hints,
  };
}