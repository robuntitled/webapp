/** Navigazione principale Noivia: Organizza / Gruppi / I miei viaggi */

export const PRIMARY_NAV = [
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
    match: (pathname: string) =>
      pathname === '/gruppi' ||
      pathname.startsWith('/gruppi/') ||
      pathname.startsWith('/partenze'),
  },
  {
    href: '/pratiche',
    label: 'I miei viaggi',
    auth: true as const,
    match: (pathname: string) =>
      pathname.startsWith('/pratiche') || pathname.startsWith('/pratica'),
  },
] as const;

export type PrimaryNavItem = (typeof PRIMARY_NAV)[number];
