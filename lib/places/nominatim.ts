import type { NominatimResult, PlaceResult } from '@/lib/places/types';
import { isLatinScriptText, placeUsesLatinScript } from '@/lib/places/latin-script';
import {
  buildCategoryQuery,
  type ActivityPlaceCategory,
} from '@/lib/places/activity-categories';

const PLACE_TYPE_LABELS: Record<string, string> = {
  country: 'Nazione',
  state: 'Regione',
  region: 'Regione',
  county: 'Provincia',
  city: 'Città',
  town: 'Città',
  village: 'Paese',
  hamlet: 'Borgo',
  suburb: 'Quartiere',
  neighbourhood: 'Quartiere',
  municipality: 'Comune',
  administrative: 'Area',
  island: 'Isola',
  archipelago: 'Arcipelago',
  locality: 'Località',
  // POI
  restaurant: 'Ristorante',
  cafe: 'Caffè',
  bar: 'Bar',
  pub: 'Pub',
  fast_food: 'Fast food',
  museum: 'Museo',
  gallery: 'Galleria',
  attraction: 'Attrazione',
  artwork: 'Opera',
  monument: 'Monumento',
  memorial: 'Memoriale',
  castle: 'Castello',
  ruins: 'Rovine',
  viewpoint: 'Belvedere',
  theme_park: 'Parco divertimenti',
  zoo: 'Zoo',
  aquarium: 'Acquario',
  park: 'Parco',
  beach: 'Spiaggia',
  sports_centre: 'Centro sportivo',
  spa: 'Spa',
};

/** Tipi utili come meta viaggio (nazioni, città, paesi, isole). */
const DESTINATION_TYPES = new Set([
  'country',
  'state',
  'region',
  'county',
  'city',
  'town',
  'village',
  'hamlet',
  'municipality',
  'administrative',
  'island',
  'archipelago',
  'locality',
  'suburb',
  'neighbourhood',
]);

const PREFERRED_NAME_KEYS = [
  'name:it',
  'name:en',
  'int_name',
  'name:latin',
  'alt_name:en',
  'official_name:en',
  'official_name:it',
] as const;

export function placeTypeLabel(type: string): string {
  return PLACE_TYPE_LABELS[type] ?? 'Luogo';
}

/**
 * OSM often returns type=administrative for countries; refine when possible.
 */
export function resolvePlaceType(result: NominatimResult): string {
  const addr = result.address;
  const type = result.type;

  if (type === 'country') return 'country';
  if (result.class === 'boundary' && type === 'administrative') {
    // Country-level: no city/town and address is essentially the country
    if (addr?.country && !addr.city && !addr.town && !addr.village && !addr.municipality) {
      if (!addr.state || addr.state === addr.country) return 'country';
    }
    if (addr?.state && !addr.city && !addr.town && !addr.village) return 'state';
  }
  if (result.class === 'place' && DESTINATION_TYPES.has(type)) return type;
  return type;
}

function nameFromNamedetails(result: NominatimResult): string | null {
  const details = result.namedetails;
  if (!details) return null;

  for (const key of PREFERRED_NAME_KEYS) {
    const value = details[key]?.trim();
    if (value && isLatinScriptText(value)) return value;
  }

  // Any name:* key in Latin (e.g. name:fr, name:es)
  for (const [key, raw] of Object.entries(details)) {
    if (!key.startsWith('name:') && key !== 'int_name') continue;
    const value = raw?.trim();
    if (value && isLatinScriptText(value)) return value;
  }

  const fallback = details.name?.trim();
  if (fallback && isLatinScriptText(fallback)) return fallback;

  return null;
}

function nameFromAddress(result: NominatimResult): string | null {
  const addr = result.address;
  if (!addr) return null;

  const named =
    addr.city ??
    addr.town ??
    addr.village ??
    addr.hamlet ??
    addr.municipality ??
    addr.state ??
    addr.country;
  if (named && isLatinScriptText(named)) return named;

  return null;
}

function nameFromDisplayName(result: NominatimResult): string {
  const first = result.display_name.split(',')[0]?.trim() || result.display_name;
  return first;
}

/** Prefer Italian/English Latin names; never return non-Latin as the final label. */
function primaryName(result: NominatimResult): string | null {
  const fromDetails = nameFromNamedetails(result);
  if (fromDetails) return fromDetails;

  if (result.name?.trim() && isLatinScriptText(result.name)) {
    return result.name.trim();
  }

  const fromAddress = nameFromAddress(result);
  if (fromAddress) return fromAddress;

  const fromDisplay = nameFromDisplayName(result);
  if (isLatinScriptText(fromDisplay)) return fromDisplay;

  return null;
}

function buildSubtitle(result: NominatimResult, label: string): string {
  const addr = result.address;

  if (!addr) {
    const parts = result.display_name.split(',').map((p) => p.trim());
    return parts
      .slice(1, 4)
      .filter((p) => isLatinScriptText(p))
      .join(', ');
  }

  const locality = addr.city ?? addr.town ?? addr.village ?? addr.hamlet;
  const parts = [locality, addr.state, addr.country].filter(
    (p, i, arr) =>
      !!p && isLatinScriptText(p) && arr.indexOf(p) === i && p !== label
  );
  return (
    parts.join(', ') ||
    (addr.country && isLatinScriptText(addr.country) ? addr.country : '')
  );
}

export function parseNominatimResult(result: NominatimResult): PlaceResult | null {
  const label = primaryName(result);
  // Skip results we cannot show in Western (Latin) script
  if (!label || !isLatinScriptText(label)) return null;

  const subtitle = buildSubtitle(result, label);
  if (!placeUsesLatinScript(label, subtitle)) return null;

  const country = result.address?.country;
  const countryCode = result.address?.country_code?.toUpperCase();
  const placeType = resolvePlaceType(result);

  return {
    id: String(result.place_id),
    label,
    subtitle,
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    placeType,
    placeTypeLabel: placeTypeLabel(placeType),
    country: country && isLatinScriptText(country) ? country : undefined,
    countryCode,
  };
}

export type SearchPlacesOptions = {
  limit?: number;
  /** Filtra POI per categoria composer (attrazioni / attività / ristoranti). */
  category?: ActivityPlaceCategory | string | null;
};

export async function searchPlaces(
  query: string,
  limitOrOptions: number | SearchPlacesOptions = 12
): Promise<PlaceResult[]> {
  const options: SearchPlacesOptions =
    typeof limitOrOptions === 'number' ? { limit: limitOrOptions } : limitOrOptions;
  const limit = options.limit ?? 12;
  let category: ActivityPlaceCategory | null = null;
  if (
    options.category === 'attraction' ||
    options.category === 'activity' ||
    options.category === 'meal'
  ) {
    category = options.category;
  }

  const rawQuery = query.trim();
  if (rawQuery.length < 2) return [];

  const q = category ? buildCategoryQuery(rawQuery, category) : rawQuery;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  // Extra rows: Latin filter + optional category filter need headroom
  const fetchLimit = category
    ? Math.min(Math.max(limit * 6, 30), 50)
    : Math.min(Math.max(limit * 4, 20), 40);
  url.searchParams.set('limit', String(fetchLimit));
  // Prefer Italian, then English (Latin names for most countries)
  url.searchParams.set('accept-language', 'it,en,de,fr,es,pt');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'NomadLink/1.0 (travel composer; contact@nomadlink.app)',
      Accept: 'application/json',
      'Accept-Language': 'it,en;q=0.9',
    },
    // Avoid Next.js data cache returning empty/stale failures for live search
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = (await response.json()) as NominatimResult[];

  const seen = new Set<string>();
  const places: PlaceResult[] = [];

  for (const raw of data) {
    const place = parseNominatimResult(raw);
    if (!place) continue;

    // Category is used only as a soft query boost (buildCategoryQuery above).
    // Hard post-filters dropped almost all OSM results in production.

    // Dedupe same label+coords
    const key = `${place.label.toLowerCase()}|${place.lat.toFixed(3)}|${place.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push(place);
    if (places.length >= limit) break;
  }

  return places;
}
