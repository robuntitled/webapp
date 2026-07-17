/**
 * Categorie per "Aggiungi attività" nel composer.
 * Ordine UI: Attrazioni → Attività → Ristoranti.
 */
export type ActivityPlaceCategory = 'attraction' | 'activity' | 'meal';

export const ACTIVITY_PLACE_CATEGORY_ORDER: ActivityPlaceCategory[] = [
  'attraction',
  'activity',
  'meal',
];

export const ACTIVITY_PLACE_CATEGORY_LABELS: Record<ActivityPlaceCategory, string> = {
  attraction: 'Attrazioni',
  activity: 'Attività',
  meal: 'Ristoranti',
};

type CategorySearchConfig = {
  /** Termini aggiunti alla query OSM/Google per spingere la categoria. */
  queryBoost: string;
  /** Google Places Text Search `type` (uno solo supportato). */
  googleType?: string;
  /** Token che indicano appartenenza (match su type/label/subtitle/name). */
  include: string[];
  /** Token che escludono il risultato da questa categoria. */
  exclude: string[];
};

/**
 * Config ricerca/filtro per categoria.
 * include/exclude lavorano su stringhe normalizzate (lowercase, underscore → spazio).
 */
export const ACTIVITY_CATEGORY_SEARCH: Record<ActivityPlaceCategory, CategorySearchConfig> = {
  attraction: {
    queryBoost: 'attrazione museo monumento',
    googleType: 'tourist_attraction',
    include: [
      'attraction',
      'tourist',
      'tourism',
      'museum',
      'museo',
      'gallery',
      'galleria',
      'monument',
      'monumento',
      'landmark',
      'castle',
      'castello',
      'palace',
      'palazzo',
      'temple',
      'tempio',
      'church',
      'chiesa',
      'cathedral',
      'cattedrale',
      'ruins',
      'rovine',
      'viewpoint',
      'panorama',
      'park',
      'parco',
      'zoo',
      'aquarium',
      'acquario',
      'historic',
      'heritage',
      'memorial',
      'fountain',
      'fontana',
      'square',
      'piazza',
      'artwork',
      'archaeological',
      'sights',
      'sightseeing',
      'palace',
      'fort',
      'forte',
      'tower',
      'torre',
      'bridge',
      'ponte',
    ],
    exclude: [
      'restaurant',
      'ristorante',
      'cafe',
      'caffè',
      'bar',
      'pub',
      'bistro',
      'trattoria',
      'pizzeria',
      'osteria',
      'food',
      'meal',
      'hotel',
      'hostel',
      'motel',
    ],
  },
  activity: {
    queryBoost: 'attività tour esperienza sport',
    // no single Google type covers "activities" well
    googleType: undefined,
    include: [
      'activity',
      'attività',
      'tour',
      'experience',
      'esperienza',
      'sport',
      'spa',
      'wellness',
      'gym',
      'palestra',
      'hiking',
      'trekking',
      'diving',
      'snorkel',
      'surf',
      'kayak',
      'boat',
      'barca',
      'cruise',
      'crociera',
      'class',
      'corso',
      'workshop',
      'adventure',
      'avventura',
      'amusement',
      'theme_park',
      'parco divertimenti',
      'ski',
      'sci',
      'bike',
      'bici',
      'rent',
      'noleggio',
      'escape',
      'bowling',
      'cinema',
      'theater',
      'teatro',
      'concert',
      'concerto',
      'club',
      'discoteca',
      'beach_club',
    ],
    exclude: [
      'restaurant',
      'ristorante',
      'cafe',
      'caffè',
      'pizzeria',
      'trattoria',
      'osteria',
      'bistro',
      'museum',
      'museo',
      'monument',
      'monumento',
      'hotel',
      'hostel',
    ],
  },
  meal: {
    queryBoost: 'ristorante',
    googleType: 'restaurant',
    include: [
      'restaurant',
      'ristorante',
      'cafe',
      'caffè',
      'coffee',
      'bar',
      'pub',
      'bistro',
      'trattoria',
      'osteria',
      'pizzeria',
      'enoteca',
      'wine_bar',
      'food',
      'meal',
      'dining',
      'bakery',
      'panetteria',
      'gelateria',
      'ice_cream',
      'fast_food',
      'street_food',
      'kitchen',
      'brasserie',
      'taverna',
      'sushi',
      'ramen',
    ],
    exclude: [
      'museum',
      'museo',
      'monument',
      'monumento',
      'gallery',
      'galleria',
      'castle',
      'castello',
      'temple',
      'tempio',
      'church',
      'chiesa',
      'hotel',
      'hostel',
      'attraction',
      'tourist_attraction',
    ],
  },
};

function normalizeHaystack(...parts: Array<string | undefined | null>): string {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasToken(haystack: string, token: string): boolean {
  const t = token.toLowerCase().trim();
  if (!t) return false;
  // word-ish match: token as whole word or substring for multi-word tokens
  if (t.includes(' ')) return haystack.includes(t);
  const re = new RegExp(`(^|[^a-zà-ü0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zà-ü0-9]|$)`, 'i');
  return re.test(haystack);
}

export function buildCategoryQuery(userQuery: string, category: ActivityPlaceCategory): string {
  const q = userQuery.trim();
  const boost = ACTIVITY_CATEGORY_SEARCH[category].queryBoost;
  // Avoid doubling if user already typed the category word
  if (q.toLowerCase().includes(boost.split(' ')[0]!)) return q;
  return `${q} ${boost}`.trim();
}

export function matchesActivityCategory(
  category: ActivityPlaceCategory,
  fields: {
    label?: string;
    subtitle?: string;
    placeType?: string;
    placeTypeLabel?: string;
    types?: string[];
  }
): boolean {
  const cfg = ACTIVITY_CATEGORY_SEARCH[category];
  const haystack = normalizeHaystack(
    fields.label,
    fields.subtitle,
    fields.placeType,
    fields.placeTypeLabel,
    ...(fields.types ?? [])
  );
  if (!haystack) return false;

  for (const ex of cfg.exclude) {
    if (hasToken(haystack, ex)) return false;
  }

  for (const inc of cfg.include) {
    if (hasToken(haystack, inc)) return true;
  }

  // Strict: no include match → out (prevents cities/admin areas polluting meal search)
  return false;
}

export function isActivityPlaceCategory(value: string | null | undefined): value is ActivityPlaceCategory {
  return value === 'attraction' || value === 'activity' || value === 'meal';
}
