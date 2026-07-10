import type { NominatimResult, PlaceResult } from '@/lib/places/types';

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

export function placeTypeLabel(type: string): string {
  return PLACE_TYPE_LABELS[type] ?? 'Luogo';
}

function primaryName(result: NominatimResult): string {
  if (result.name?.trim()) return result.name.trim();
  const addr = result.address;
  if (addr) {
    const named =
      addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.municipality ?? addr.state;
    if (named) return named;
  }
  return result.display_name.split(',')[0]?.trim() || result.display_name;
}

function buildSubtitle(result: NominatimResult): string {
  const addr = result.address;
  if (!addr) {
    const parts = result.display_name.split(',').map((p) => p.trim());
    return parts.slice(1, 4).join(', ');
  }

  const locality = addr.city ?? addr.town ?? addr.village ?? addr.hamlet;
  const parts = [locality, addr.state, addr.country].filter(
    (p, i, arr) => p && arr.indexOf(p) === i && p !== primaryName(result)
  );
  return parts.join(', ') || addr.country || '';
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
    country,
    countryCode,
  };
}

export async function searchPlaces(query: string, limit = 12): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('accept-language', 'it');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'NomadLink/1.0 (travel composer; contact@nomadlink.app)',
      Accept: 'application/json',
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = (await response.json()) as NominatimResult[];
  return data.map(parseNominatimResult);
}