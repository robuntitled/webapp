/**
 * NomadPoints — programma loyalty di piattaforma.
 *
 * Punti guadagnati per AZIONI sulla piattaforma (creare, far partire un gruppo,
 * invitare, unirsi, recensire). NON sono denaro, NON sono cashback, NON sono
 * legati all'importo di viaggi o servizi: si riscattano solo in perk di
 * piattaforma (es. boost in Esplora, template premium, crediti AI, cover pro).
 *
 * Essendo slegati dalla spesa e non convertibili in denaro, restano fuori dalla
 * disciplina delle promozioni a premi (DPR 430/2001): sono un semplice programma
 * di fidelizzazione a punti spendibili solo dentro NomadLink.
 */

export const NOMAD_POINTS_LABEL = 'NomadPoints';

export type PointsAction =
  | 'create_trip_published'
  | 'group_formed'
  | 'referral_join'
  | 'joined_trip'
  | 'review_written'
  | 'profile_completed';

export type PointsActionDef = {
  points: number;
  label: string;
  description: string;
};

/** Valore in punti di ogni azione. */
export const POINTS: Record<PointsAction, PointsActionDef> = {
  create_trip_published: {
    points: 150,
    label: 'Crei e pubblichi un viaggio',
    description: 'Pubblichi un viaggio in formazione su Esplora.',
  },
  group_formed: {
    points: 300,
    label: 'Il gruppo raggiunge il minimo',
    description: 'Un tuo viaggio raggiunge il numero minimo di partecipanti.',
  },
  referral_join: {
    points: 120,
    label: 'Un invitato si unisce',
    description: 'Una persona che hai invitato accetta e si unisce.',
  },
  joined_trip: {
    points: 60,
    label: 'Ti unisci a un viaggio',
    description: 'Accetti un invito e ti unisci a un gruppo.',
  },
  review_written: {
    points: 40,
    label: 'Scrivi una recensione',
    description: 'Lasci una recensione a un creator o a un viaggio.',
  },
  profile_completed: {
    points: 50,
    label: 'Completi il profilo',
    description: 'Foto, bio e preferenze di viaggio.',
  },
};

export type Tier = {
  id: 'explorer' | 'nomad' | 'pioneer' | 'legend';
  label: string;
  min: number;
  perkBoost: string;
};

/** Livelli di status: sbloccano riconoscimento e sconti sui perk. */
export const TIERS: Tier[] = [
  { id: 'explorer', label: 'Explorer', min: 0, perkBoost: 'Accesso base ai perk' },
  { id: 'nomad', label: 'Nomad', min: 500, perkBoost: 'Badge Nomad + perk sbloccati' },
  { id: 'pioneer', label: 'Pioneer', min: 1500, perkBoost: '-10% sul costo dei perk' },
  { id: 'legend', label: 'Legend', min: 4000, perkBoost: '-20% sui perk + priorità in Esplora' },
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
  id: string;
  label: string;
  cost: number;
  emoji: string;
  description: string;
};

/** Catalogo perk riscattabili (solo piattaforma, mai denaro). */
export const PERKS: Perk[] = [
  {
    id: 'trip_boost_7d',
    label: 'Boost in Esplora · 7 giorni',
    cost: 400,
    emoji: '🚀',
    description: 'Il tuo viaggio in evidenza tra i primi risultati per una settimana.',
  },
  {
    id: 'ai_credits_10',
    label: '10 generazioni AI extra',
    cost: 250,
    emoji: '✨',
    description: 'Rigenera itinerari e varianti con l’assistente AI.',
  },
  {
    id: 'premium_templates',
    label: 'Template premium',
    cost: 300,
    emoji: '🗺️',
    description: 'Sblocca gli itinerari template curati e stagionali.',
  },
  {
    id: 'cover_pro',
    label: 'Cover Pro per il viaggio',
    cost: 150,
    emoji: '🎨',
    description: 'Copertine premium per far risaltare il tuo viaggio.',
  },
];

export function formatPoints(points: number): string {
  return new Intl.NumberFormat('it-IT').format(Math.max(0, Math.round(points)));
}
