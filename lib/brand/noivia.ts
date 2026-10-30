/** Brand UI Noivia (Indaco Rotta). Non tocca LEGAL_* / domini / email. */

export const BRAND_NAME = 'Noivia';
export const BRAND_TAGLINE = 'Il tuo viaggio senza tour operator';
export const BRAND_SLOGAN = 'noi, via! · Il tuo viaggio senza tour operator';

/** TODO owner: registrare domini e aggiornare env/LEGAL_* */
export const BRAND_TODO = [
  'Registrare noivia.it (e alias) e aggiornare NEXT_PUBLIC_APP_URL',
  'Aggiornare LEGAL_TRADE_NAME / company.defaults tradeName',
  'Aggiornare privacy@ / supporto@ e LEGAL_* email',
  'Aggiornare AUTH_URL / cookie domain dopo cutover DNS',
  'Aggiornare OG images e email sender branding',
] as const;

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
