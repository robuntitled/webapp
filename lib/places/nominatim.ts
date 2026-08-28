import type { NominatimResult, PlaceResult } from '@/lib/places/types';
import { isLatinScriptText, placeUsesLatinScript } from '@/lib/places/latin-script';

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
};

const PREFERRED_NAME_KEYS = [
  'name:it',
  'name:en',
  'int_name',
  'name:latin',
  'alt_name:en',
  'official_name:en',
] as const;

export function placeTypeLabel(type: string): string {
  return PLACE_TYPE_LABELS[type] ?? 'Luogo';
}

function nameFromNamedetails(result: NominatimResult): string | null {
  const details = result.namedetails;
  if (!details) return null;

  for (const key of PREFERRED_NAME_KEYS) {
    const value = details[key]?.trim();
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
    addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.municipality ?? addr.state;
  if (named && isLatinScriptText(named)) return named;

  return null;
}

function nameFromDisplayName(result: NominatimResult): string {
  const first = result.display_name.split(',')[0]?.trim() || result.display_name;
  return first;
}

function primaryName(result: NominatimResult): string {
  const fromDetails = nameFromNamedetails(result);
  if (fromDetails) return fromDetails;

  if (result.name?.trim() && isLatinScriptText(result.name)) {
    return result.name.trim();
  }

  const fromAddress = nameFromAddress(result);
  if (fromAddress) return fromAddress;

  const fromDisplay = nameFromDisplayName(result);
  if (isLatinScriptText(fromDisplay)) return fromDisplay;

  return fromDisplay;
}

function buildSubtitle(result: NominatimResult): string {
  const addr = result.address;
  const label = primaryName(result);

  if (!addr) {
    const parts = result.display_name.split(',').map((p) => p.trim());
    return parts
      .slice(1, 4)
      .filter((p) => isLatinScriptText(p))
      .join(', ');
  }

  const locality = addr.city ?? addr.town ?? addr.village ?? addr.hamlet;
  const parts = [locality, addr.state, addr.country].filter(
    (p, i, arr) => p && isLatinScriptText(p) && arr.indexOf(p) === i && p !== label
  );
  const subtitle = parts.join(', ') || (addr.country && isLatinScriptText(addr.country) ? addr.country : '');
  return subtitle;
}

export function parseNominatimResult(result: NominatimResult): PlaceResult {
  const label = primaryName(result);
  const country = result.address?.country;
  const countryCode = result.address?.country_code?.toUpperCase();

  return {
    id: String(result.place_id),
    label,
    subtitle: buildSubtitle(result),
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    placeType: result.type,
    placeTypeLabel: placeTypeLabel(result.type),
    country: country && isLatinScriptText(country) ? country : undefined,
    countryCode,
  };
}

const NOMINATIM_HEADERS = {
  'User-Agent': 'Bradigo/1.0 (travel composer; contact@nomadlink.app)',
  Accept: 'application/json',
  'Accept-Language': 'it,en;q=0.9',
} as const;

export async function searchPlaces(query: string, limit = 12): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('limit', String(Math.min(limit * 3, 40)));
  url.searchParams.set('accept-language', 'it,en');

  const response = await fetch(url.toString(), {
    headers: NOMINATIM_HEADERS,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = (await response.json()) as NominatimResult[];

  return data
    .map(parseNominatimResult)
    .filter((place) => placeUsesLatinScript(place.label, place.subtitle))
    .slice(0, limit);
}

/** Reverse geocode lat/lng → città (server-side, User-Agent valido). */
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', lat.toFixed(6));
  url.searchParams.set('lon', lng.toFixed(6));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('accept-language', 'it,en');
  url.searchParams.set('zoom', '10');

  const response = await fetch(url.toString(), {
    headers: NOMINATIM_HEADERS,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Nominatim reverse error: ${response.status}`);
  }

  const data = (await response.json()) as NominatimResult & { error?: string };
  if (!data || data.error || !data.lat || !data.lon) return null;

  return parseNominatimResult(data);
}