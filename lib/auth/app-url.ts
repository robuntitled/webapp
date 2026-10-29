/**
 * URL canonico dell'app — necessario per OAuth callback e link email.
 *
 * Preview/development: preferisci VERCEL_URL (deployment corrente), così i link
 * non puntano al dominio di produzione impostato in AUTH_URL.
 * Production: AUTH_URL → NEXTAUTH_URL → NEXT_PUBLIC_APP_URL → VERCEL_URL.
 */
export function getAppBaseUrl(): string {
  const vercelEnv = process.env.VERCEL_ENV?.trim();
  const vercelHost = process.env.VERCEL_URL?.trim()?.replace(/^https?:\/\//, '');

  if (
    (vercelEnv === 'preview' || vercelEnv === 'development') &&
    vercelHost
  ) {
    return `https://${vercelHost}`;
  }

  const explicit =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  if (vercelHost) {
    return `https://${vercelHost}`;
  }

  return 'http://localhost:3000';
}

export function getOAuthCallbackUrl(provider: 'google' | 'facebook'): string {
  return `${getAppBaseUrl()}/api/auth/callback/${provider}`;
}
