import { defaultOriginIata, originFromCityLabel } from '@/lib/travel/origin-iata';
import type { ComposerDraft, ComposerOrigin } from '@/types/composer';

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