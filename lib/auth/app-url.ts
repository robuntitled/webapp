/**
 * URL canonico dell'app — necessario per OAuth callback corretti in produzione.
 * Priorità: AUTH_URL → NEXT_PUBLIC_APP_URL → VERCEL_URL
 */
export function getAppBaseUrl(): string {
  const explicit =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '');
    return `https://${host}`;
  }

  return 'http://localhost:3000';
}

export function getOAuthCallbackUrl(provider: 'google' | 'facebook'): string {
  return `${getAppBaseUrl()}/api/auth/callback/${provider}`;
}