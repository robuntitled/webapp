import { resolveDestinationIata } from '@/lib/travel/iata';

/** Aeroporti vicini a città/paesi italiani non coperti dalla mappa principale */
const ORIGIN_ALIASES: Record<string, string> = {
  ancona: 'AOI',
  falconara: 'AOI',
  macerata: 'AOI',
  'monte san giusto': 'AOI',
  pesaro: 'AOI',
  urbino: 'AOI',
  ascoli: 'AOI',
  'ascoli piceno': 'AOI',
  fermo: 'AOI',
  senigallia: 'AOI',
  jesi: 'AOI',
  civitanova: 'AOI',
  bologna: 'BLQ',
  torino: 'TRN',
  turin: 'TRN',
  genova: 'GOA',
  genoa: 'GOA',
  bari: 'BRI',
  brindisi: 'BDS',
  pescara: 'PSR',
  trieste: 'TRS',
  verona: 'VRN',
  bergamo: 'BGY',
  orio: 'BGY',
  pisa: 'PSA',
  perugia: 'PEG',
  cagliari: 'CAG',
  olbia: 'OLB',
  palermo: 'PMO',
};

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Risolve città/paese utente → codice IATA aeroporto di partenza.
 * Es. "Milano" → MIL, "Monte San Giusto" → AOI
 */
export function resolveOriginIata(cityOrLabel: string, country?: string): string | null {
  if (!cityOrLabel?.trim()) return null;

  const combined = country ? `${cityOrLabel}, ${country}` : cityOrLabel;
  const fromMain = resolveDestinationIata(combined) ?? resolveDestinationIata(cityOrLabel);
  if (fromMain) return fromMain;

  const normalized = normalize(cityOrLabel);
  if (ORIGIN_ALIASES[normalized]) return ORIGIN_ALIASES[normalized];

  for (const [key, iata] of Object.entries(ORIGIN_ALIASES)) {
    if (normalized.includes(key) || key.includes(normalized)) return iata;
  }

  return null;
}

export function defaultOriginIata(): string {
  return (
    process.env.NEXT_PUBLIC_DEFAULT_ORIGIN_IATA?.trim().toUpperCase() ||
    process.env.NEXT_PUBLIC_TRAVELPAYOUTS_DEFAULT_ORIGIN_IATA?.trim().toUpperCase() ||
    'ROM'
  );
}

export function originFromCityLabel(label: string, country?: string): {
  label: string;
  city: string;
  iata: string;
} {
  const city = label.split(',')[0]?.trim() || label;
  const iata = resolveOriginIata(city, country) ?? defaultOriginIata();
  return { label: city, city, iata };
}