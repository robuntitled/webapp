/**
 * Titoli viaggio in italiano corretto (preposizioni + congiunzioni).
 */

/** Regioni, nazioni e isole grandi → "in". */
const IN_PLACES = new Set(
  [
    // Regioni IT
    'abruzzo',
    'basilicata',
    'calabria',
    'campania',
    'emilia-romagna',
    'emilia romagna',
    'friuli',
    'friuli-venezia giulia',
    'lazio',
    'liguria',
    'lombardia',
    'marche',
    'molise',
    'piemonte',
    'puglia',
    'sardegna',
    'sicilia',
    'toscana',
    'trentino',
    'trentino-alto adige',
    'umbria',
    "valle d'aosta",
    'valle daosta',
    'veneto',
    // Isole
    'corsica',
    'creta',
    'maiorca',
    'mallorca',
    'ibiza',
    'tenerife',
    'gran canaria',
    'maldive',
    'seychelles',
    'bali',
    'sicily',
    'sardinia',
    // Paesi (IT / EN comuni)
    'italia',
    'italy',
    'francia',
    'france',
    'spagna',
    'spain',
    'portogallo',
    'portugal',
    'germania',
    'germany',
    'grecia',
    'greece',
    'croazia',
    'croatia',
    'slovenia',
    'austria',
    'svizzera',
    'switzerland',
    'olanda',
    'paesi bassi',
    'netherlands',
    'belgio',
    'belgium',
    'inghilterra',
    'scozia',
    'irlanda',
    'ireland',
    'regno unito',
    'uk',
    'turchia',
    'turkey',
    'egitto',
    'egypt',
    'marocco',
    'morocco',
    'tunisia',
    'giappone',
    'japan',
    'thailandia',
    'thailand',
    'vietnam',
    'indonesia',
    'india',
    'cina',
    'china',
    'brasile',
    'brazil',
    'argentina',
    'messico',
    'mexico',
    'canada',
    'australia',
    'nuova zelanda',
    'new zealand',
    'perù',
    'peru',
    'cile',
    'chile',
    'colombia',
    'kenia',
    'kenya',
    'tanzania',
    'sudafrica',
    'south africa',
    'emirati',
    'emirati arabi',
    'emirati arabi uniti',
    'uae',
    'qatar',
    'giordania',
    'jordan',
    'israele',
    'israel',
    'polonia',
    'poland',
    'repubblica ceca',
    'cechia',
    'ungheria',
    'hungary',
    'romania',
    'bulgaria',
    'serbia',
    'albania',
    'montenegro',
    'bosnia',
    'islanda',
    'iceland',
    'norvegia',
    'norway',
    'svezia',
    'sweden',
    'danimarca',
    'denmark',
    'finlandia',
    'finland',
    'usa',
    'stati uniti',
    'united states',
  ].map((s) => s.toLowerCase())
);

/** Articoli determinativi davanti a città (al / all'). */
const ARTICLES: Record<string, string> = {
  cairo: 'al Cairo',
  'il cairo': 'al Cairo',
  aquila: "all'Aquila",
  "l'aquila": "all'Aquila",
  aja: "all'Aja",
  'l’aja': "all'Aja",
  'l\'aja': "all'Aja",
};

function normalizeKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

/** Capitalizza in modo leggibile (Dubai, New York, L'Aquila). */
export function formatPlaceName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  // Mantieni acronimi corti
  if (/^[A-Z]{2,4}$/.test(trimmed)) return trimmed;
  return trimmed
    .split(/([\s'-])/)
    .map((part) => {
      if (part === ' ' || part === '-' || part === "'") return part;
      if (!part) return part;
      const lower = part.toLowerCase();
      if (['di', 'da', 'del', 'della', 'dei', 'delle', 'e', 'la', 'le', 'lo', 'gli'].includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/** Preposizione corretta: "a Roma", "in Sicilia", "al Cairo". */
export function placeWithPreposition(name: string): string {
  const raw = name.trim();
  if (!raw) return raw;
  const key = normalizeKey(raw);
  if (ARTICLES[key]) return ARTICLES[key];
  const pretty = formatPlaceName(raw);
  if (IN_PLACES.has(key)) return `in ${pretty}`;
  // "a" + apostrofo se inizia per vocale
  if (/^[aeiouàèéìòù]/i.test(pretty)) return `ad ${pretty}`;
  return `a ${pretty}`;
}

/** Elenco luoghi: "Sicilia e Dubai" / "Roma, Firenze e Napoli". */
export function formatDestinationList(labels: string[]): string {
  const clean = labels.map((l) => formatPlaceName(l)).filter(Boolean);
  if (clean.length === 0) return 'nuova meta';
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} e ${clean[1]}`;
  const head = clean.slice(0, -1).join(', ');
  return `${head} e ${clean[clean.length - 1]}`;
}

/** Frase con preposizioni: "in Sicilia e a Dubai". */
export function formatDestinationsWithPrepositions(labels: string[]): string {
  const clean = labels.map((l) => l.trim()).filter(Boolean);
  if (clean.length === 0) return 'nuova meta';
  if (clean.length === 1) return placeWithPreposition(clean[0]);
  if (clean.length === 2) {
    return `${placeWithPreposition(clean[0])} e ${placeWithPreposition(clean[1])}`;
  }
  const parts = clean.map((c) => placeWithPreposition(c));
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

type TitleBuilder = (labels: string[]) => string;

const TITLE_TEMPLATES: TitleBuilder[] = [
  (labels) => `Viaggio ${formatDestinationsWithPrepositions(labels)}`,
  (labels) => `Esplorando ${formatDestinationList(labels)}`,
  (labels) => `Avventura: ${formatDestinationList(labels)}`,
  (labels) =>
    labels.length === 1
      ? `Alla scoperta di ${formatPlaceName(labels[0])}`
      : `Alla scoperta di ${formatDestinationList(labels)}`,
  (labels) => `Itinerario ${formatDestinationList(labels)}`,
  (labels) =>
    labels.length === 1
      ? `Weekend ${placeWithPreposition(labels[0])}`
      : `Weekend tra ${formatDestinationList(labels)}`,
  (labels) =>
    labels.length === 1
      ? `Tra le meraviglie di ${formatPlaceName(labels[0])}`
      : `Tra ${formatDestinationList(labels)}`,
  (labels) => `Partenza ${formatDestinationsWithPrepositions(labels)}`,
];

export function generateTripTitle(
  destinationLabels: string | string[],
  seed?: string
): string {
  const labels = (
    Array.isArray(destinationLabels) ? destinationLabels : [destinationLabels]
  )
    .map((l) => l.trim())
    .filter(Boolean);

  const safe = labels.length > 0 ? labels : ['nuova meta'];
  let index = Math.floor(Math.random() * TITLE_TEMPLATES.length);
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash + seed.charCodeAt(i) * (i + 1)) % TITLE_TEMPLATES.length;
    }
    index = hash;
  }
  return TITLE_TEMPLATES[index](safe);
}

/**
 * Corregge titoli già salvati con errori tipici ("Viaggio a Sicilia & Dubai").
 */
export function polishTripTitle(title: string): string {
  let t = title.trim();
  if (!t) return t;

  t = t.replace(/\s*&\s*/g, ' e ');
  t = t.replace(/\s+\+\s*/g, ' e ');

  // "Viaggio a X e a Y" / "Viaggio a X e Y" → riparti da destinazioni se pattern noto
  const viaggioMatch = t.match(
    /^Viaggio\s+(.+)$/i
  );
  if (viaggioMatch) {
    const rest = viaggioMatch[1]
      .replace(/\s+e\s+/gi, '|')
      .replace(/\s*,\s*/g, '|');
    const parts = rest
      .split('|')
      .map((p) =>
        p
          .replace(/^(a|ad|in|al|all['’]|nel|nello|nella|nei|nelle)\s+/i, '')
          .trim()
      )
      .filter(Boolean);
    if (parts.length >= 1 && parts.length <= 4) {
      return `Viaggio ${formatDestinationsWithPrepositions(parts)}`;
    }
  }

  // Fix isolati " a Sicilia" → " in Sicilia" ecc.
  for (const place of IN_PLACES) {
    const re = new RegExp(`\\ba\\s+(${escapeRegExp(place)})\\b`, 'gi');
    t = t.replace(re, (_m, p: string) => `in ${formatPlaceName(p)}`);
  }

  return t.replace(/\s{2,}/g, ' ').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
