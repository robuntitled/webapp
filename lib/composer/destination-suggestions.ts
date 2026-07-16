import { COMPOSER_DESTINATIONS } from '@/lib/composer/destinations';
import type { ComposerDestination } from '@/types/composer';
import type { PlannerProfile, PlannerTravelDistance } from '@/types/planner';

const STYLE_VIBES: Record<string, string[]> = {
  adventure: ['natura', 'surf', 'safari', 'trek', 'road'],
  relax: ['spiagge', 'sole', 'paradiso', 'calette', 'tropicale'],
  culture: ['cultura', 'arte', 'musei', 'templi', 'medina'],
  food: ['street food', 'tapas', 'sushi', 'pho', 'tacos'],
  mix: [],
};

const INTEREST_VIBES: Record<string, string[]> = {
  photography: ['tramonti', 'skyline', 'aurora'],
  nature: ['natura', 'risaie', 'savana', 'cenote'],
  beaches: ['spiagge', 'spiagge', 'costa', 'mare'],
  nightlife: ['movida', 'city'],
  history: ['cultura', 'machu picchu', 'medina'],
  art: ['arte', 'musei', 'boulevard'],
  hiking: ['natura', 'trek', 'isole'],
  food: ['street food', 'tapas', 'sushi', 'granita'],
  shopping: ['city', 'boulevard'],
  wellness: ['relax', 'paradiso'],
  family: ['spiagge', 'family'],
  local: ['street food', 'local'],
};

/** Distanza approssimativa da Italia (Roma) in km — per ranking mete. */
const DISTANCE_FROM_ITALY_KM: Record<string, number> = {
  sicilia: 600,
  sardegna: 400,
  croazia: 500,
  grecia: 1100,
  spagna: 1400,
  portogallo: 1900,
  parigi: 1100,
  londra: 1400,
  amsterdam: 1300,
  canarie: 2800,
  islanda: 3300,
  marocco: 2100,
  thailandia: 8800,
  bali: 11800,
  giappone: 9800,
  vietnam: 9000,
  maldive: 7500,
  dubai: 4300,
  'new-york': 6900,
  messico: 10000,
  peru: 10500,
  kenya: 5500,
  australia: 16500,
  corea: 9000,
};

function distanceScore(destId: string, pref?: PlannerTravelDistance): number {
  const km = DISTANCE_FROM_ITALY_KM[destId] ?? 5000;
  if (!pref || pref === 'medium') return km < 2500 ? 2 : km < 7000 ? 1 : 0;
  if (pref === 'near') return km < 2000 ? 3 : km < 3500 ? 1 : -2;
  return km > 5000 ? 3 : km > 2500 ? 1 : -1;
}

function vibeScore(dest: ComposerDestination, profile?: PlannerProfile | null): number {
  if (!profile) return 0;
  let score = 0;
  const vibes = dest.vibe.toLowerCase();
  const styleHints = STYLE_VIBES[profile.travelStyle] ?? [];
  for (const hint of styleHints) {
    if (vibes.includes(hint)) score += 3;
  }
  for (const interest of profile.interests) {
    for (const hint of INTEREST_VIBES[interest] ?? []) {
      if (vibes.includes(hint)) score += 2;
    }
  }
  if (profile.budgetLevel === 'budget' && ['asia', 'africa', 'americhe'].includes(dest.region.toLowerCase())) {
    score += 1;
  }
  if (profile.budgetLevel === 'premium' && ['dubai', 'maldive', 'new-york'].includes(dest.id)) {
    score += 2;
  }
  score += distanceScore(dest.id, profile.travelDistance);
  return score;
}

export function rankDestinationsForProfile(
  profile?: PlannerProfile | null,
  query = ''
): ComposerDestination[] {
  const q = query.trim().toLowerCase();
  let list = COMPOSER_DESTINATIONS;
  if (q) {
    list = list.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        d.vibe.toLowerCase().includes(q)
    );
  }
  return [...list].sort((a, b) => vibeScore(b, profile) - vibeScore(a, profile));
}