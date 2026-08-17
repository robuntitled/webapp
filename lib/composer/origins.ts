import { defaultOriginIata, originFromCityLabel } from '@/lib/travel/origin-iata';
import { placeDisplayValue, primaryAirportsForCountry, type PlaceSuggestion } from '@/lib/travel/airport-catalog';
import type { ComposerDraft, ComposerOrigin } from '@/types/composer';
import type { RankedOriginAirport } from '@/lib/composer/origin-airport-rank';

export function createOriginId(): string {
  return `org_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildOrganizerOrigin(city: string, country?: string): ComposerOrigin {
  const { label, city: resolvedCity, iata } = originFromCityLabel(city, country);
  return { id: createOriginId(), label, city: resolvedCity, iata, role: 'organizer' };
}

export function buildCrewOrigin(city: string, country?: string): ComposerOrigin {
  const { label, city: resolvedCity, iata } = originFromCityLabel(city, country);
  return { id: createOriginId(), label, city: resolvedCity, iata, role: 'crew' };
}

export function originFromRankedAirport(
  airport: RankedOriginAirport,
  role: ComposerOrigin['role'] = 'organizer'
): ComposerOrigin {
  return {
    id: createOriginId(),
    label: `${airport.city} · ${airport.iata}`,
    city: airport.city,
    iata: airport.iata,
    role,
    airportName: airport.name,
  };
}

export function originFromPlace(
  place: PlaceSuggestion,
  role: ComposerOrigin['role'] = 'organizer'
): ComposerOrigin {
  if (place.kind === 'country') {
    const hub = primaryAirportsForCountry(place.code, 1)[0];
    const iata = hub?.iata ?? defaultOriginIata();
    return {
      id: createOriginId(),
      label: place.label,
      city: hub?.city ?? place.label,
      iata,
      role,
      airportName: hub?.name,
    };
  }
  return {
    id: createOriginId(),
    label: placeDisplayValue(place),
    city: place.label,
    iata: place.code,
    role,
    airportName: place.kind === 'airport' ? place.sublabel : undefined,
  };
}

export function collectOrigins(
  params: Pick<ComposerDraft, 'organizerOrigin' | 'crewOrigins'>
): ComposerOrigin[] {
  const list: ComposerOrigin[] = [];
  if (params.organizerOrigin) list.push(params.organizerOrigin);
  if (params.crewOrigins?.length) list.push(...params.crewOrigins);
  return list;
}

/** Tutte le partenze del viaggio (organizzatore + amici). */
export function collectOriginsFromDraft(draft: ComposerDraft): ComposerOrigin[] {
  return collectOrigins(draft);
}

/** Evita card volo duplicate quando più persone partono dallo stesso hub. */
export function uniqueOriginsByIata(origins: ComposerOrigin[]): ComposerOrigin[] {
  const seen = new Set<string>();
  return origins.filter((o) => {
    const key = o.iata.toUpperCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function primaryOriginIata(draft: ComposerDraft): string {
  return draft.organizerOrigin?.iata ?? defaultOriginIata();
}

export function originsSummaryForPrompt(
  draft: Pick<ComposerDraft, 'organizerOrigin' | 'crewOrigins'>
): string | null {
  const origins = collectOrigins(draft);
  if (origins.length === 0) return null;

  const parts = origins.map((o) =>
    o.role === 'organizer'
      ? `Organizzatore da ${o.city} (aeroporto ${o.iata})`
      : `Amico da ${o.city} (aeroporto ${o.iata})`
  );
  return parts.join('; ');
}