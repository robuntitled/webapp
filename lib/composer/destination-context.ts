/**
 * Contesto destinazione per la generazione itinerario.
 *
 * Obiettivo: niente più segnaposto tipo "Aeroporto internazionale più vicino".
 * O risolviamo un aeroporto reale (IATA + nome), oppure lo dichiariamo assente
 * e la UI/prompt lo trattano come "da confermare".
 */
import {
  findAirportByIata,
  findAirportsForCity,
  matchCountryOnly,
  primaryAirportsForCountry,
  type AirportInfo,
} from '@/lib/travel/airport-catalog';
import { COUNTRY_OPTIONS } from '@/lib/travel/countries';
import { resolveDestinationIata } from '@/lib/travel/iata';
import type { DestinationMeta } from '@/types/composer';

/** Codici città multi-aeroporto (metro code) usati da IATA/LiteAPI. */
const METRO_CODES: Record<string, { city: string; label: string }> = {
  ROM: { city: 'Roma', label: 'Roma (ROM)' },
  MIL: { city: 'Milano', label: 'Milano (MIL)' },
  LON: { city: 'Londra', label: 'Londra (LON)' },
  PAR: { city: 'Parigi', label: 'Parigi (PAR)' },
  NYC: { city: 'New York', label: 'New York (NYC)' },
  TYO: { city: 'Tokyo', label: 'Tokyo (TYO)' },
  OSA: { city: 'Osaka', label: 'Osaka (OSA)' },
  SEL: { city: 'Seoul', label: 'Seoul (SEL)' },
  BUE: { city: 'Buenos Aires', label: 'Buenos Aires (BUE)' },
  RIO: { city: 'Rio de Janeiro', label: 'Rio de Janeiro (RIO)' },
  STO: { city: 'Stoccolma', label: 'Stoccolma (STO)' },
  REK: { city: 'Reykjavik', label: 'Reykjavik (REK)' },
};

/** Tipi Nominatim che indicano un'area troppo ampia per pianificare un viaggio. */
const VAGUE_PLACE_TYPES = new Set(['country', 'continent']);

export type DestinationAirport = {
  iata: string;
  /** Etichetta leggibile: "Sydney Kingsford Smith (SYD)" — mai generica. */
  label: string;
  city: string;
  /** true = codice città multi-aeroporto (ROM, TYO…) invece di un singolo scalo. */
  metro: boolean;
};

export type DestinationContext = {
  /** Città/area su cui costruire l'itinerario (mai il solo nome del paese). */
  cityLabel: string;
  countryLabel?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  /** Aeroporto d'arrivo risolto, oppure null se sconosciuto. */
  airport: DestinationAirport | null;
  /** true = destinazione troppo generica (solo paese) per pianificare. */
  isVague: boolean;
  /** Città consigliate quando isVague = true. */
  hubSuggestions: string[];
  /** Hub usato al posto del paese, se abbiamo potuto sceglierne uno. */
  fallbackHub: AirportInfo | null;
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['’]/g, '')
    .replace(/\s+/g, ' ');
}

function firstSegment(destination: string): string {
  return destination.split(',')[0]?.trim() || destination.trim();
}

function countryFromLabel(value: string): { code: string; label: string } | null {
  const fromCatalog = matchCountryOnly(value);
  if (fromCatalog) return fromCatalog;

  const q = normalize(value);
  const option = COUNTRY_OPTIONS.find((c) => normalize(c.label) === q || c.code.toLowerCase() === q);
  return option ? { code: option.code, label: option.label } : null;
}

function airportFromIata(iata: string): DestinationAirport | null {
  const code = iata.trim().toUpperCase();
  const metro = METRO_CODES[code];
  if (metro) {
    return { iata: code, label: metro.label, city: metro.city, metro: true };
  }
  const info = findAirportByIata(code);
  if (!info) return null;
  return { iata: info.iata, label: info.label, city: info.city, metro: false };
}

function airportForCity(city: string, countryCode?: string): DestinationAirport | null {
  const matches = findAirportsForCity(city);
  const scoped = countryCode
    ? matches.filter((a) => a.countryCode === countryCode.toUpperCase())
    : matches;
  const best = (scoped.length > 0 ? scoped : matches)[0];
  if (best) {
    return { iata: best.iata, label: best.label, city: best.city, metro: false };
  }

  const iata = resolveDestinationIata(city);
  return iata ? airportFromIata(iata) : null;
}

/**
 * Risolve città, paese e aeroporto d'arrivo a partire dai dati del composer.
 * Non inventa mai un aeroporto: se non è risolvibile resta `airport: null`.
 */
export function resolveDestinationContext(
  destination: string,
  meta?: Partial<DestinationMeta>
): DestinationContext {
  const rawLabel = (meta?.label ?? firstSegment(destination) ?? '').trim();
  const countryFromMeta =
    meta?.countryCode || meta?.country
      ? {
          code: (meta.countryCode ?? countryFromLabel(meta.country ?? '')?.code ?? '').toUpperCase(),
          label: meta.country ?? countryFromLabel(meta.countryCode ?? '')?.label ?? '',
        }
      : null;

  const labelIsCountry = countryFromLabel(rawLabel);
  const destinationIsCountry = countryFromLabel(destination.trim());
  const typeIsVague = meta?.placeType ? VAGUE_PLACE_TYPES.has(meta.placeType) : false;

  const country =
    countryFromMeta && countryFromMeta.code
      ? countryFromMeta
      : (labelIsCountry ?? destinationIsCountry);

  const isVague = Boolean(typeIsVague || labelIsCountry || (!meta && destinationIsCountry));

  const hubs = country?.code ? primaryAirportsForCountry(country.code, 3) : [];
  const fallbackHub = isVague ? (hubs[0] ?? null) : null;

  const cityLabel = isVague && fallbackHub ? fallbackHub.city : rawLabel || destination.trim();

  const airport = isVague
    ? fallbackHub
      ? { iata: fallbackHub.iata, label: fallbackHub.label, city: fallbackHub.city, metro: false }
      : null
    : (airportForCity(cityLabel, country?.code) ??
      (destination !== cityLabel ? airportForCity(destination, country?.code) : null));

  return {
    cityLabel,
    countryLabel: country?.label || meta?.country,
    countryCode: country?.code || meta?.countryCode?.toUpperCase(),
    lat: typeof meta?.lat === 'number' ? meta.lat : undefined,
    lng: typeof meta?.lng === 'number' ? meta.lng : undefined,
    airport,
    isVague,
    hubSuggestions: hubs.map((h) => h.city),
    fallbackHub,
  };
}

export type DestinationCheck =
  | { ok: true; warning?: string }
  | { ok: false; message: string };

/**
 * Blocca la generazione quando la destinazione è un intero paese senza hub noto.
 * Se un hub c'è, si procede ma con avviso esplicito (niente scelte silenziose).
 */
export function checkDestinationPlannable(ctx: DestinationContext): DestinationCheck {
  if (!ctx.isVague) {
    return ctx.airport
      ? { ok: true }
      : {
          ok: true,
          warning:
            'Aeroporto di arrivo non riconosciuto — il volo resta da confermare manualmente',
        };
  }

  if (!ctx.fallbackHub) {
    const suggestion = ctx.hubSuggestions[0];
    return {
      ok: false,
      message: suggestion
        ? `«${ctx.countryLabel ?? 'La destinazione'}» è un intero paese: scegli una città (es. ${suggestion}) e riprova.`
        : `«${ctx.countryLabel ?? 'La destinazione'}» è troppo generica: scegli una città o una zona precisa e riprova.`,
    };
  }

  return {
    ok: true,
    warning: `Destinazione a livello paese: itinerario costruito su ${ctx.fallbackHub.city} (${ctx.fallbackHub.iata}). Cambia meta se preferisci un'altra città.`,
  };
}

/** Etichetta aeroporto per prompt/blocchi — senza segnaposto generici. */
export function airportPromptLabel(ctx: DestinationContext): string {
  return ctx.airport ? ctx.airport.label : `${ctx.cityLabel} (aeroporto da confermare)`;
}
