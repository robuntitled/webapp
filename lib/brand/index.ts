/** Source of truth brand UI + SEO. */

export const BRAND_NAME = 'Noivia' as const;

export const BRAND_TAGLINE = 'Il tuo viaggio, senza tour operator' as const;

export const BRAND_HOME_SUBTITLE =
  'Organizzalo con i tuoi amici o unisciti a un gruppo in partenza.' as const;

export const BRAND_SLOGAN = `noi, via! · ${BRAND_TAGLINE}` as const;

export const BRAND_DESCRIPTION =
  `${BRAND_TAGLINE}. ${BRAND_HOME_SUBTITLE}` as const;

/**
 * Canonical site origin (no trailing slash).
 * Precedence: NEXT_PUBLIC_APP_URL → VERCEL production → preview → localhost.
 */
export function getSiteUrl(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromPublic) return fromPublic.replace(/\/$/, '');

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod.replace(/\/$/, '')}`;

  const preview =
    process.env.VERCEL_BRANCH_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (preview) return `https://${preview.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

/** Evaluated at module load for metadata / sitemap / robots. */
export const SITE_URL = getSiteUrl();

/** From display name per email (indirizzo mittente invariato). */
export function brandEmailFrom(address = 'onboarding@resend.dev'): string {
  return `${BRAND_NAME} <${address}>`;
}

/** TODO owner: registrare domini e aggiornare env/LEGAL_* */
export const BRAND_TODO = [
  'Registrare noivia.it (e alias) e aggiornare NEXT_PUBLIC_APP_URL',
  'Aggiornare LEGAL_TRADE_NAME / company.defaults tradeName',
  'Aggiornare privacy@ / supporto@ e LEGAL_* email',
  'Aggiornare AUTH_URL / cookie domain dopo cutover DNS',
  'Aggiornare OG images e email sender branding',
  'Documentare licenze cover destinazioni (oggi Wikimedia/Unsplash preesistenti)',
] as const;

/** Asset brand (path-based SVG — niente <text> live). */
export const BRAND_ASSETS = {
  wordmark: '/assets/logoNoivia.svg',
  wordmarkWhite: '/assets/logoNoivia-white.svg',
  mark: '/assets/iconNoivia.svg',
  favicon: '/favicon.svg',
  icon192: '/icons/icon-192.png',
  icon512: '/icons/icon-512.png',
  appleTouch: '/apple-touch-icon.png',
} as const;

export const BRAND_COLORS = {
  brand: '#232A6B',
  brandDark: '#1A1F52',
  cta: '#C9442A',
  ctaDark: '#A93720',
  tint: '#EEF0FA',
  lilac: '#8A92E6',
  text: '#14182E',
  textSecondary: '#5D6275',
  border: '#E3E5EC',
  success: '#15803D',
} as const;

/** Route map nuova IA */
export const ROUTES = {
  home: '/',
  organizza: '/organizza',
  gruppi: '/gruppi',
  mieiViaggi: '/pratiche',
  /** Legacy aliases (redirect) */
  destinazioni: '/destinazioni',
  partenze: '/partenze',
} as const;
