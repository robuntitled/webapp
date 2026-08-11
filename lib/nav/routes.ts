/**
 * Information architecture v1.1 — route canoniche.
 * Path legacy restano raggiungibili via redirect (next.config / middleware).
 */

export const ROUTES = {
  /** Guest: marketing + auth/wizard */
  home: '/',
  /** Loggato: hub a card */
  hub: '/hub',
  scopri: '/scopri',
  organizza: '/organizza',
  iMiei: '/i-miei',
  prenota: '/prenota',
  messaggi: '/messaggi',
  profilo: '/profilo',
  impostazioni: '/impostazioni',
  preferiti: '/preferiti',
  costi: '/costi',
  completaRegistrazione: '/completa-registrazione',
  privacy: '/privacy',
  termini: '/termini',
  cookie: '/cookie',
  viaggi: {
    detail: (id: string) => `/viaggi/${id}` as const,
  },
  prenotaPaths: {
    root: '/prenota',
    voli: '/prenota/voli',
    hotel: '/prenota/hotel',
    auto: '/prenota/auto',
    attrazioni: '/prenota/attrazioni',
    attivita: '/prenota/attivita',
    bus: '/prenota/trasporti/bus',
    treni: '/prenota/trasporti/treni',
    taxi: '/prenota/trasporti/taxi',
  },
} as const;

/** Post-login default (callback OAuth / credentials). */
export const POST_LOGIN_PATH = ROUTES.hub;

/** Desktop top shortcuts (loggato). */
export const DESKTOP_SHORTCUTS = [
  { href: ROUTES.scopri, label: 'Scopri' },
  { href: ROUTES.iMiei, label: 'I miei' },
  { href: ROUTES.messaggi, label: 'Messaggi' },
  { href: ROUTES.profilo, label: 'Profilo' },
] as const;

/** Hamburger mobile (e menu esteso). */
export const HAMBURGER_LINKS = [
  { href: ROUTES.hub, label: 'Hub', auth: true },
  { href: ROUTES.scopri, label: 'Scopri' },
  { href: `${ROUTES.organizza}?new=1`, label: 'Organizza', auth: true },
  { href: ROUTES.iMiei, label: 'I miei viaggi', auth: true },
  { href: ROUTES.prenota, label: 'Prenota', auth: true },
  { href: ROUTES.messaggi, label: 'Messaggi', auth: true },
  { href: ROUTES.profilo, label: 'Profilo', auth: true },
  { href: ROUTES.impostazioni, label: 'Impostazioni', auth: true },
  { href: ROUTES.preferiti, label: 'Preferiti', auth: true },
  { href: ROUTES.privacy, label: 'Privacy' },
  { href: ROUTES.termini, label: 'Termini' },
  { href: ROUTES.cookie, label: 'Cookie' },
] as const;

/** Hub doors — ordine default mode "unirmi". */
export const HUB_DOORS_JOIN = [
  {
    id: 'scopri',
    href: ROUTES.scopri,
    label: 'Scopri',
    title: 'Scopri viaggi',
    description: 'Esplora trip aperti e unisciti alla crew.',
  },
  {
    id: 'organizza',
    href: `${ROUTES.organizza}?new=1`,
    label: 'Organizza',
    title: 'Organizza un viaggio',
    description: 'Wizard passo-passo per creare l’itinerario.',
  },
  {
    id: 'i-miei',
    href: ROUTES.iMiei,
    label: 'I miei',
    title: 'I miei viaggi',
    description: 'Bozze, attivi, inviti e la tua crew.',
  },
  {
    id: 'prenota',
    href: ROUTES.prenota,
    label: 'Prenota',
    title: 'Prenota servizi',
    description: 'Voli, hotel e trasporti legati a un viaggio.',
  },
] as const;

/** Hub doors — ordine mode "organizzare" (Organizza in evidenza). */
export const HUB_DOORS_ORGANIZE = [
  HUB_DOORS_JOIN[1],
  HUB_DOORS_JOIN[0],
  HUB_DOORS_JOIN[2],
  HUB_DOORS_JOIN[3],
] as const;

export type RoleMode = 'join' | 'organize';

export const ROLE_MODE_STORAGE_KEY = 'nomadlink.roleMode';
