import 'server-only';

import { COUNTRY_AIRPORTS } from '@/lib/travel/airports-by-country';
import { findDestination } from '@/lib/composer/destinations';
import { searchPlaces } from '@/lib/places/nominatim';
import { searchLiteAirports, type LiteAirport } from '@/lib/liteapi/airports';
import {
  rankOriginAirports,
  tripHaulKm,
  type RankedOriginAirport,
} from '@/lib/composer/origin-airport-rank';
import { haversineKm } from '@/lib/maps/distance';
import type { DestinationMeta } from '@/types/composer';
import { isLiteApiConfigured } from '@/lib/liteapi/config';

export type SuggestOriginAirportsInput = {
  query?: string;
  lat?: number | null;
  lng?: number | null;
  destination?: string;
  destinationMeta?: Partial<DestinationMeta> | null;
};

const ITALY_HUB_QUERIES = ['FCO', 'MXP', 'Rome', 'Milan'];
const ITALY_NEAR_QUERIES = ['Ancona', 'Bologna', 'Venice', 'Florence'];

function destPoint(
  destination?: string,
  meta?: Partial<DestinationMeta> | null
): { lat: number; lng: number } | null {
  if (typeof meta?.lat === 'number' && typeof meta?.lng === 'number') {
    return { lat: meta.lat, lng: meta.lng };
  }
  if (!destination?.trim()) return null;
  const known = findDestination(destination);
  if (known) return { lat: known.lat, lng: known.lng };
  return null;
}

async function extraQueries(
  originCountry: string | undefined,
  origin: { lat: number; lng: number } | null,
  dest: { lat: number; lng: number } | null
): Promise<string[]> {
  const haul = tripHaulKm(origin && dest ? haversineKm(origin, dest) : null);
  const cc = originCountry?.toUpperCase();
  const extras: string[] = [];
  if (cc === 'IT' || !cc) {
    extras.push(...ITALY_NEAR_QUERIES);
    if (haul === 'long') extras.push(...ITALY_HUB_QUERIES);
    else extras.push('FCO');
  } else {
    const group = COUNTRY_AIRPORTS.find((g) => g.code === cc);
    extras.push(...(group?.airports.slice(0, 3) ?? []));
  }
  return extras;
}

export async function suggestOriginAirports(
  input: SuggestOriginAirportsInput
): Promise<{ airports: RankedOriginAirport[]; queryLabel: string }> {
  if (!isLiteApiConfigured()) {
    return { airports: [], queryLabel: input.query?.trim() || '' };
  }

  const query = input.query?.trim() ?? '';
  let origin: { lat: number; lng: number } | null =
    input.lat != null && input.lng != null ? { lat: input.lat, lng: input.lng } : null;
  let originCountry: string | undefined;
  let queryLabel = query;

  if (!origin && query.length >= 2) {
    const places = await searchPlaces(query, 3).catch(() => []);
    const hit = places[0];
    if (hit) {
      origin = { lat: hit.lat, lng: hit.lng };
      originCountry = hit.countryCode;
      queryLabel = hit.label;
    }
  }

  const dest = destPoint(input.destination, input.destinationMeta);
  const extras = await extraQueries(originCountry, origin, dest);
  const searches = [...new Set([query, queryLabel, ...extras].filter((q) => q.length >= 2))];

  const batches = await Promise.allSettled(searches.map((q) => searchLiteAirports(q)));
  const merged: LiteAirport[] = [];
  const seen = new Set<string>();
  for (const batch of batches) {
    if (batch.status !== 'fulfilled') continue;
    for (const airport of batch.value) {
      if (seen.has(airport.iata)) continue;
      seen.add(airport.iata);
      merged.push(airport);
    }
  }

  const ranked = rankOriginAirports({
    airports: merged,
    origin,
    destination: dest,
  });

  return { airports: ranked, queryLabel };
}
