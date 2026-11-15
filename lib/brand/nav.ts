/** Navigazione principale Noivia — mockup home-m / nav-d */

export { HOME_HREF, USER_AREA_HREF, USER_AREA_LABEL, brandHomeHref } from '@/lib/nav/home';

export const PRIMARY_NAV = [
  {
    href: '/',
    label: 'Esplora',
    match: (pathname: string) => pathname === '/',
  },
  {
    href: '/organizza',
    label: 'Organizza',
    match: (pathname: string) =>
      pathname === '/organizza' ||
      pathname.startsWith('/organizza/') ||
      pathname.startsWith('/itinerario'),
  },
  {
    href: '/gruppi',
    label: 'Gruppi',
    desktopLabel: 'Partenze di gruppo',
    match: (pathname: string) =>
      pathname === '/gruppi' ||
      pathname.startsWith('/gruppi/') ||
      pathname.startsWith('/partenze'),
  },
  {
    href: '/pratiche',
    label: 'Viaggi',
    desktopLabel: 'I miei viaggi',
    auth: true as const,
    guestHref: '/accedi?callbackUrl=%2Fpratiche',
    match: (pathname: string) =>
      pathname.startsWith('/pratiche') || pathname.startsWith('/pratica'),
  },
] as const;

export const MOBILE_TAB_NAV = [
  {
    id: 'esplora',
    href: '/',
    label: 'Esplora',
    match: (pathname: string) => pathname === '/',
  },
  {
    id: 'organizza',
    href: '/organizza',
    label: 'Organizza',
    match: (pathname: string) =>
      pathname === '/organizza' || pathname.startsWith('/organizza/'),
  },
  {
    id: 'gruppi',
    href: '/gruppi',
    label: 'Gruppi',
    match: (pathname: string) =>
      pathname === '/gruppi' ||
      pathname.startsWith('/gruppi/') ||
      pathname.startsWith('/partenze'),
  },
  {
    id: 'viaggi',
    href: '/pratiche',
    label: 'Viaggi',
    auth: true as const,
    guestHref: '/accedi?callbackUrl=%2Fpratiche',
    match: (pathname: string) =>
      pathname.startsWith('/pratiche') || pathname.startsWith('/pratica'),
  },
  {
    id: 'profilo',
    href: '/profilo',
    label: 'Profilo',
    auth: true as const,
    guestHref: '/accedi?callbackUrl=%2Fprofilo',
    match: (pathname: string) =>
      pathname.startsWith('/profilo') ||
      pathname.startsWith('/dashboard/profilo') ||
      pathname.startsWith('/dashboard/impostazioni'),
  },
] as const;

export const PROFILE_MENU = [
  { href: '/profilo', label: 'Profilo' },
  { href: '/profilo#viaggiatori', label: 'Viaggiatori e documenti' },
  { href: '/profilo#ricevute', label: 'Pagamenti e ricevute' },
  { href: '/dashboard/impostazioni', label: 'Impostazioni' },
  { href: '/assistenza', label: 'Assistenza' },
] as const;

export type PrimaryNavItem = (typeof PRIMARY_NAV)[number];
