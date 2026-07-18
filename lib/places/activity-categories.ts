/**
 * Categorie per "Aggiungi attività" nel composer.
 * Ordine UI: Attrazioni → Attività → Ristoranti.
 *
 * La settorializzazione Overpass usa i tag OSM (tourism/amenity/leisure/historic/…).
 * I selettori sono stretti e mutuamente esclusivi dove possibile.
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
  /** Termini aggiunti alla query Nominatim/Google per spingere la categoria. */
  queryBoost: string;
  /** Google Places Text Search `type` (uno solo supportato). */
  googleType?: string;
  /**
   * Selettori Overpass senza around.
   * Placeholder `__FILTERS__` → filtri nome opzionali + (around:…).
   * Esempio: nwr["tourism"="museum"]__FILTERS__
   */
  overpassSelectors: string[];
  /** Token che indicano appartenenza (match su type/label/subtitle/name). */
  include: string[];
  /** Token che escludono il risultato da questa categoria. */
  exclude: string[];
  /** Parole generiche: se l'utente cerca solo queste, mostra POI della categoria in zona. */
  genericQueries: string[];
};

/**
 * Config ricerca/filtro per categoria.
 * include/exclude lavorano su stringhe normalizzate (lowercase, underscore → spazio).
 */
export const ACTIVITY_CATEGORY_SEARCH: Record<ActivityPlaceCategory, CategorySearchConfig> = {
  attraction: {
    queryBoost: 'attrazione monumento museo',
    googleType: 'tourist_attraction',
    // Visite / sightseeing — NO ristoranti, NO sport generici
    overpassSelectors: [
      'nwr["tourism"~"^(attraction|museum|gallery|artwork|viewpoint|zoo|aquarium|theme_park|yes)$"]__FILTERS__',
      'nwr["historic"~"^(monument|memorial|castle|ruins|archaeological_site|fort|manor|palace|city_gate|tower|church|cathedral|monastery|tomb|wayside_shrine|building)$"]__FILTERS__',
      'nwr["amenity"~"^(place_of_worship|theatre|arts_centre|fountain|library|townhall)$"]__FILTERS__',
      'nwr["leisure"~"^(park|garden|nature_reserve)$"]__FILTERS__',
      'nwr["building"~"^(cathedral|church|chapel|mosque|synagogue|temple)$"]__FILTERS__',
    ],
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
      'duomo',
      'basilica',
      'ruins',
      'rovine',
      'viewpoint',
      'panorama',
      'belvedere',
      'park',
      'parco',
      'giardino',
      'garden',
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
      'fort',
      'forte',
      'tower',
      'torre',
      'bridge',
      'ponte',
      'santuario',
      'abbazia',
      'monastero',
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
      'fast food',
      'fast_food',
    ],
    genericQueries: [
      'museo',
      'museum',
      'monumento',
      'monument',
      'castello',
      'castle',
      'duomo',
      'chiesa',
      'church',
      'cattedrale',
      'cathedral',
      'parco',
      'park',
      'giardino',
      'garden',
      'attrazione',
      'attraction',
      'panorama',
      'viewpoint',
      'belvedere',
      'fontana',
      'piazza',
      'zoo',
      'acquario',
      'aquarium',
      'rovine',
      'ruins',
      'tempio',
      'temple',
    ],
  },
  activity: {
    queryBoost: 'attività sport esperienza',
    googleType: undefined,
    // Esperienze / sport / divertimento — NO musei/monumenti, NO ristoranti, NO semplici city park
    overpassSelectors: [
      'nwr["leisure"~"^(sports_centre|fitness_centre|swimming_pool|stadium|pitch|track|golf_course|water_park|ice_rink|bowling_alley|trampoline_park|miniature_golf|climbing|escape_game|horse_riding|marina|beach_resort|sauna|dance|adult_gaming_centre|hackerspace)$"]__FILTERS__',
      'nwr["sport"]__FILTERS__',
      'nwr["tourism"~"^(theme_park|zoo|aquarium|picnic_site)$"]__FILTERS__',
      'nwr["amenity"~"^(casino|nightclub|events_venue|cinema|dive_centre|boat_rental|bicycle_rental|karaoke_box|public_bath)$"]__FILTERS__',
      'nwr["shop"~"^(sports|bicycle|outdoor|scuba_diving|fishing|ski)$"]__FILTERS__',
    ],
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
      'fitness',
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
      'concert',
      'concerto',
      'club',
      'discoteca',
      'beach_club',
      'piscina',
      'swimming',
      'pool',
      'golf',
      'tennis',
      'rafting',
      'climbing',
      'arrampicata',
      'kayak',
      'canoa',
      'yoga',
      'terme',
      'thermal',
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
      'church',
      'chiesa',
      'cathedral',
      'cattedrale',
    ],
    genericQueries: [
      'sport',
      'palestra',
      'gym',
      'fitness',
      'piscina',
      'pool',
      'swimming',
      'spa',
      'terme',
      'golf',
      'tennis',
      'bowling',
      'cinema',
      'kayak',
      'surf',
      'diving',
      'snorkel',
      'bike',
      'bici',
      'noleggio',
      'escape',
      'attività',
      'activity',
      'tour',
      'avventura',
      'adventure',
      'rafting',
      'climbing',
      'arrampicata',
      'ski',
      'sci',
      'yoga',
      'discoteca',
      'nightclub',
    ],
  },
  meal: {
    queryBoost: 'ristorante',
    googleType: 'restaurant',
    overpassSelectors: [
      'nwr["amenity"~"^(restaurant|cafe|fast_food|bar|pub|biergarten|food_court|ice_cream|bistro)$"]__FILTERS__',
      'nwr["shop"~"^(bakery|pastry|coffee|confectionery|deli|chocolate|wine)$"]__FILTERS__',
      'nwr["cuisine"]__FILTERS__',
    ],
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
      'cuisine',
      'gastronomia',
      'paninoteca',
      'kebab',
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
    genericQueries: [
      'ristorante',
      'restaurant',
      'pizzeria',
      'pizza',
      'trattoria',
      'osteria',
      'cafe',
      'caffè',
      'coffee',
      'bar',
      'pub',
      'bistro',
      'gelateria',
      'gelato',
      'sushi',
      'ramen',
      'kebab',
      'panetteria',
      'bakery',
      'enoteca',
      'cibo',
      'food',
      'mangiare',
      'pranzo',
      'cena',
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
  if (t.includes(' ')) return haystack.includes(t);
  const re = new RegExp(
    `(^|[^a-zà-ü0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-zà-ü0-9]|$)`,
    'i'
  );
  return re.test(haystack);
}

export function buildCategoryQuery(userQuery: string, category: ActivityPlaceCategory): string {
  const q = userQuery.trim();
  const boost = ACTIVITY_CATEGORY_SEARCH[category].queryBoost;
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

  return false;
}

/**
 * True se la query è una parola generica di categoria
 * (es. "museo", "pizzeria", "piscina") → ha senso elencare POI in zona.
 */
export function isGenericCategoryQuery(
  query: string,
  category: ActivityPlaceCategory
): boolean {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return false;
  const cfg = ACTIVITY_CATEGORY_SEARCH[category];
  if (cfg.genericQueries.some((g) => q === g || q === `${g}s` || q === `${g}i`)) {
    return true;
  }
  // "museo egizio" non è generico; "musei" sì
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return cfg.genericQueries.some(
      (g) => words[0] === g || words[0].startsWith(g) || g.startsWith(words[0])
    );
  }
  // due parole solo se entrambe generiche o una è articolo
  if (words.length === 2 && ['il', 'lo', 'la', 'un', 'una', 'the', 'a', 'di', 'del'].includes(words[0]!)) {
    return cfg.genericQueries.includes(words[1]!);
  }
  return false;
}

export function isActivityPlaceCategory(
  value: string | null | undefined
): value is ActivityPlaceCategory {
  return value === 'attraction' || value === 'activity' || value === 'meal';
}

function escapeOverpassRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Costruisce i selettori Overpass.
 * Con nameToken: solo POI della categoria il cui nome matcha (migliore qualità).
 * Senza nameToken: tutti i POI della categoria in raggio (browse generico).
 */
export function buildOverpassCategoryClauses(
  category: ActivityPlaceCategory,
  lat: number,
  lng: number,
  radiusM: number,
  nameToken?: string
): string {
  const around = `(around:${radiusM},${lat},${lng})`;
  // Match name / name:it / name:en
  const nameFilter = nameToken
    ? `[~"^name(:[a-z]{2})?$"~"${escapeOverpassRegex(nameToken.slice(0, 60))}",i]`
    : '';
  const filters = `${nameFilter}${around}`;

  return ACTIVITY_CATEGORY_SEARCH[category].overpassSelectors
    .map((sel) => `${sel.replace('__FILTERS__', filters)};`)
    .join('\n  ');
}

/** Tag OSM → appartiene alla categoria? (post-filtro coerente con i selettori). */
export function tagsMatchActivityCategory(
  tags: Record<string, string | undefined>,
  category: ActivityPlaceCategory
): boolean {
  const amenity = (tags.amenity || '').toLowerCase();
  const tourism = (tags.tourism || '').toLowerCase();
  const leisure = (tags.leisure || '').toLowerCase();
  const shop = (tags.shop || '').toLowerCase();
  const historic = (tags.historic || '').toLowerCase();
  const building = (tags.building || '').toLowerCase();
  const hasSport = Boolean(tags.sport);
  const hasCuisine = Boolean(tags.cuisine);

  // Food always wins for meal; never for other categories
  const isMeal =
    /^(restaurant|cafe|fast_food|bar|pub|biergarten|food_court|ice_cream|bistro)$/.test(
      amenity
    ) ||
    /^(bakery|pastry|coffee|confectionery|deli|chocolate|wine)$/.test(shop) ||
    hasCuisine;

  if (category === 'meal') return isMeal;
  if (isMeal) return false;

  if (category === 'attraction') {
    if (
      /^(attraction|museum|gallery|artwork|viewpoint|zoo|aquarium|theme_park|yes)$/.test(
        tourism
      )
    ) {
      return true;
    }
    if (
      /^(monument|memorial|castle|ruins|archaeological_site|fort|manor|palace|city_gate|tower|church|cathedral|monastery|tomb|wayside_shrine|building)$/.test(
        historic
      )
    ) {
      return true;
    }
    if (/^(place_of_worship|theatre|arts_centre|fountain|library|townhall)$/.test(amenity)) {
      return true;
    }
    if (/^(park|garden|nature_reserve)$/.test(leisure)) return true;
    if (/^(cathedral|church|chapel|mosque|synagogue|temple)$/.test(building)) return true;
    return false;
  }

  // activity
  if (hasSport) return true;
  if (
    /^(sports_centre|fitness_centre|swimming_pool|stadium|pitch|track|golf_course|water_park|ice_rink|bowling_alley|trampoline_park|miniature_golf|climbing|escape_game|horse_riding|marina|beach_resort|sauna|dance|adult_gaming_centre|hackerspace)$/.test(
      leisure
    )
  ) {
    return true;
  }
  if (/^(theme_park|zoo|aquarium|picnic_site)$/.test(tourism)) return true;
  if (
    /^(casino|nightclub|events_venue|cinema|dive_centre|boat_rental|bicycle_rental|karaoke_box|public_bath)$/.test(
      amenity
    )
  ) {
    return true;
  }
  if (/^(sports|bicycle|outdoor|scuba_diving|fishing|ski)$/.test(shop)) return true;
  return false;
}
