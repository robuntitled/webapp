/**
 * NomadPoints — loyalty per AZIONI, non per spesa.
 * Non sono denaro, non sono cashback %, non si convertono in euro.
 * Riscatto solo interno: boost, template, badge, priorità Esplora, early access.
 */

export const NOMAD_POINTS_LABEL = 'NomadPoints';

export const POINTS_LAUNCH_AT = new Date('2026-08-20T00:00:00.000Z');
export const POINTS_LAUNCH_DAYS = 90;
export const FOUNDING_CREATOR_CAP = 50;

export type PointsAction =
  | 'create_trip_published'
  | 'group_formed'
  | 'group_doubled'
  | 'invite_register'
  | 'invite_join_trip'
  | 'invite_trip_departed'
  | 'joined_trip'
  | 'referral_join'
  | 'review_written'
  | 'review_verified'
  | 'profile_completed'
  | 'day90_bonus';

export type PointsActionDef = {
  points: number;
  label: string;
  description: string;
  /** Moltiplicatore nei primi 90 giorni (1 = nessuno). */
  launchMultiplier: number;
};

export const POINTS: Record<PointsAction, PointsActionDef> = {
  create_trip_published: {
    points: 20,
    launchMultiplier: 1,
    label: 'Crei un Trip',
    description: 'Pubblichi un viaggio in formazione.',
  },
  group_formed: {
    points: 150,
    launchMultiplier: 3,
    label: 'Il Trip raggiunge la soglia',
    description: 'Il gruppo arriva al minimo partecipanti.',
  },
  group_doubled: {
    points: 80,
    launchMultiplier: 3,
    label: 'Il Trip raddoppia la soglia',
    description: 'I partecipanti sono almeno il doppio del minimo.',
  },
  invite_register: {
    points: 15,
    launchMultiplier: 2,
    label: 'Un invitato si registra',
    description: 'Qualcuno si iscrive con il tuo invito.',
  },
  invite_join_trip: {
    points: 25,
    launchMultiplier: 2,
    label: 'Un invitato si iscrive a un Trip',
    description: 'La persona che hai invitato entra in un gruppo.',
  },
  invite_trip_departed: {
    points: 40,
    launchMultiplier: 2,
    label: 'Un invitato parte',
    description: 'Il Trip a cui si è unito è partito.',
  },
  joined_trip: {
    points: 0,
    launchMultiplier: 1,
    label: 'Ti unisci a un Trip',
    description: 'I punti vanno a chi ti ha invitato.',
  },
  referral_join: {
    points: 25,
    launchMultiplier: 2,
    label: 'Un invitato si iscrive a un Trip',
    description: 'Alias storico di invite_join_trip.',
  },
  review_written: {
    points: 40,
    launchMultiplier: 1,
    label: 'Recensione utile e verificata',
    description: 'Recensione dopo un Trip condiviso, almeno 40 caratteri.',
  },
  review_verified: {
    points: 40,
    launchMultiplier: 1,
    label: 'Recensione utile e verificata',
    description: 'Stesso premio, azione canonica.',
  },
  profile_completed: {
    points: 50,
    launchMultiplier: 1,
    label: 'Completi il profilo',
    description: 'Username, nome e foto.',
  },
  day90_bonus: {
    points: 50,
    launchMultiplier: 1,
    label: 'Incentivo 90 giorni',
    description: '+50 punti e boost 7 giorni.',
  },
};

export function isLaunchWindow(now = new Date()): boolean {
  const end = POINTS_LAUNCH_AT.getTime() + POINTS_LAUNCH_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() >= POINTS_LAUNCH_AT.getTime() && now.getTime() < end;
}

export function pointsForAction(
  action: PointsAction,
  opts?: { now?: Date; foundingCreator?: boolean }
): number {
  const def = POINTS[action];
  if (!def || def.points <= 0) return 0;
  let multiplier = 1;
  if (def.launchMultiplier > 1 && isLaunchWindow(opts?.now)) {
    multiplier = def.launchMultiplier;
  }
  if (opts?.foundingCreator && (action === 'group_formed' || action === 'group_doubled')) {
    multiplier = Math.max(multiplier, 3);
  }
  return def.points * multiplier;
}

export type Tier = {
  id: 'explorer' | 'nomad' | 'pioneer' | 'legend';
  label: string;
  min: number;
  perkBoost: string;
};

export const TIERS: Tier[] = [
  { id: 'explorer', label: 'Explorer', min: 0, perkBoost: 'Accesso base ai perk' },
  { id: 'nomad', label: 'Nomad', min: 500, perkBoost: 'Badge Nomad + perk sbloccati' },
  { id: 'pioneer', label: 'Pioneer', min: 1500, perkBoost: 'Priorità in Esplora' },
  { id: 'legend', label: 'Legend', min: 4000, perkBoost: 'Accesso anticipato + priorità' },
];

export function tierForPoints(points: number): Tier {
  const p = Math.max(0, points);
  let current = TIERS[0];
  for (const t of TIERS) {
    if (p >= t.min) current = t;
  }
  return current;
}

export function nextTier(points: number): Tier | null {
  const p = Math.max(0, points);
  return TIERS.find((t) => t.min > p) ?? null;
}

export function progressToNextTier(points: number): {
  current: Tier;
  next: Tier | null;
  ratio: number;
  remaining: number;
} {
  const current = tierForPoints(points);
  const next = nextTier(points);
  if (!next) return { current, next: null, ratio: 1, remaining: 0 };
  const span = next.min - current.min;
  const done = Math.max(0, points - current.min);
  return {
    current,
    next,
    ratio: span > 0 ? Math.min(1, done / span) : 1,
    remaining: Math.max(0, next.min - points),
  };
}

export type Perk = {
  id: 'trip_boost_7d' | 'trip_boost_14d' | 'premium_templates' | 'priority_explore' | 'early_access' | 'badge_founder';
  label: string;
  cost: number;
  emoji: string;
  description: string;
  requiresTrip?: boolean;
};

export const PERKS: Perk[] = [
  {
    id: 'trip_boost_7d',
    label: 'Boost 7 giorni',
    cost: 400,
    emoji: '🚀',
    requiresTrip: true,
    description: 'Il tuo Trip in evidenza su Esplora per una settimana.',
  },
  {
    id: 'trip_boost_14d',
    label: 'Boost 14 giorni',
    cost: 700,
    emoji: '🚀',
    requiresTrip: true,
    description: 'Due settimane in evidenza su Esplora.',
  },
  {
    id: 'premium_templates',
    label: 'Template avanzati',
    cost: 300,
    emoji: '🗺️',
    description: 'Sblocca itinerari template curati e stagionali.',
  },
  {
    id: 'badge_founder',
    label: 'Badge visibile',
    cost: 120,
    emoji: '🏅',
    description: 'Badge sul profilo. I Founding Creator lo hanno già.',
  },
  {
    id: 'priority_explore',
    label: 'Priorità Esplora',
    cost: 500,
    emoji: '⬆️',
    description: 'I tuoi Trip salgono in lista per 30 giorni.',
  },
  {
    id: 'early_access',
    label: 'Accesso anticipato',
    cost: 350,
    emoji: '🔑',
    description: 'Sblocca funzioni in anteprima sul tuo account.',
  },
];

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('it-IT').format(Math.max(0, Math.round(points)));
}

export const PUBLIC_EARN_ACTIONS: PointsAction[] = [
  'create_trip_published',
  'group_formed',
  'group_doubled',
  'invite_register',
  'invite_join_trip',
  'invite_trip_departed',
  'profile_completed',
  'review_verified',
];
