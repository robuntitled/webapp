/**
 * Route inventory for navigation-logic audits (guest vs logged-in expectations).
 * Keep in sync when adding top-level pages.
 */

export type RouteExpectation = {
  path: string;
  labelIt: string;
  guestOk: boolean;
  /** If guest hits this, expect redirect (substring match on Location) or 401 page. */
  guestRedirectIncludes?: string;
  logoShouldReachHome: boolean;
  notes?: string;
};

export const PUBLIC_APP_ROUTES: RouteExpectation[] = [
  {
    path: '/',
    labelIt: 'Home ingressi',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/organizza',
    labelIt: 'Organizza wizard',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/gruppi',
    labelIt: 'Gruppi / partenze',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/prenota/voli',
    labelIt: 'Ricerca voli',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/prenota/hotel',
    labelIt: 'Ricerca hotel',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/accedi',
    labelIt: 'Accedi',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/privacy',
    labelIt: 'Privacy',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/termini',
    labelIt: 'Termini',
    guestOk: true,
    logoShouldReachHome: true,
  },
  {
    path: '/cookie',
    labelIt: 'Cookie',
    guestOk: true,
    logoShouldReachHome: true,
  },
];

export const AUTH_APP_ROUTES: RouteExpectation[] = [
  {
    path: '/pratiche',
    labelIt: 'I miei viaggi',
    guestOk: false,
    guestRedirectIncludes: '/',
    logoShouldReachHome: true,
  },
  {
    path: '/dashboard/profilo',
    labelIt: 'Profilo',
    guestOk: false,
    guestRedirectIncludes: '/',
    logoShouldReachHome: true,
  },
  {
    path: '/dashboard/impostazioni',
    labelIt: 'Impostazioni',
    guestOk: false,
    guestRedirectIncludes: '/',
    logoShouldReachHome: true,
  },
  {
    path: '/bacheca',
    labelIt: 'Bacheca',
    guestOk: false,
    guestRedirectIncludes: '/accedi',
    logoShouldReachHome: true,
  },
  {
    path: '/dashboard/bacheca',
    labelIt: 'Bacheca (canonical)',
    guestOk: false,
    guestRedirectIncludes: '/accedi',
    logoShouldReachHome: true,
  },
  {
    path: '/dashboard/preferiti',
    labelIt: 'Preferiti',
    guestOk: false,
    guestRedirectIncludes: '/',
    logoShouldReachHome: true,
  },
];

/** English / inventedish fragments that must not appear in Italian UI surfaces. */
export const FORBIDDEN_UI_ENGLISH = [
  'bookability live',
  'non bookability',
  'Click here',
  'Sign in',
  'Sign up',
  'Loading...',
  'Save changes',
  'Go back',
] as const;
