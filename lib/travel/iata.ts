import {
  expandOriginIata,
  findAirportsForCity,
  matchCountryOnly,
  primaryAirportsForCountry,
} from '@/lib/travel/airport-catalog';

/** Mappa destinazioni comuni (italiano/inglese) → codice IATA aeroporto/città. */
const DESTINATION_IATA: Record<string, string> = {
  thailandia: 'BKK',
  thailand: 'BKK',
  bangkok: 'BKK',
  phuket: 'HKT',
  bali: 'DPS',
  indonesia: 'DPS',
  giappone: 'TYO',
  japan: 'TYO',
  tokyo: 'TYO',
  osaka: 'OSA',
  'new york': 'NYC',
  usa: 'NYC',
  'stati uniti': 'NYC',
  londra: 'LON',
  london: 'LON',
  'regno unito': 'LON',
  parigi: 'PAR',
  paris: 'PAR',
  francia: 'PAR',
  barcellona: 'BCN',
  barcelona: 'BCN',
  spagna: 'BCN',
  madrid: 'MAD',
  lisbona: 'LIS',
  lisbon: 'LIS',
  portogallo: 'LIS',
  amsterdam: 'AMS',
  olanda: 'AMS',
  berlino: 'BER',
  berlin: 'BER',
  germania: 'BER',
  roma: 'ROM',
  rome: 'ROM',
  milano: 'MIL',
  milan: 'MIL',
  italia: 'ROM',
  napoli: 'NAP',
  naples: 'NAP',
  sicilia: 'CTA',
  sicily: 'CTA',
  catania: 'CTA',
  palermo: 'PMO',
  sardegna: 'CAG',
  sardinia: 'CAG',
  cagliari: 'CAG',
  firenze: 'FLR',
  florence: 'FLR',
  venezia: 'VCE',
  venice: 'VCE',
  bologna: 'BLQ',
  torino: 'TRN',
  turin: 'TRN',
  genova: 'GOA',
  genoa: 'GOA',
  bari: 'BRI',
  puglia: 'BRI',
  malta: 'MLA',
  croazia: 'ZAG',
  croatia: 'ZAG',
  zagabria: 'ZAG',
  zagreb: 'ZAG',
  split: 'SPU',
  dubrovnik: 'DBV',
  atene: 'ATH',
  athens: 'ATH',
  grecia: 'ATH',
  greece: 'ATH',
  santorini: 'JTR',
  mykonos: 'JMK',
  vienna: 'VIE',
  austria: 'VIE',
  praga: 'PRG',
  prague: 'PRG',
  ibiza: 'IBZ',
  maiorca: 'PMI',
  mallorca: 'PMI',
  palma: 'PMI',
  nice: 'NCE',
  nizza: 'NCE',
  marsiglia: 'MRS',
  marseille: 'MRS',
  zurigo: 'ZRH',
  zurich: 'ZRH',
  ginevra: 'GVA',
  geneva: 'GVA',
  marocco: 'RAK',
  morocco: 'RAK',
  marrakech: 'RAK',
  egitto: 'CAI',
  egypt: 'CAI',
  cairo: 'CAI',
  'il cairo': 'CAI',
  'sharm el sheikh': 'SSH',
  sharm: 'SSH',
  hurghada: 'HRG',
  georgia: 'TBS',
  tbilisi: 'TBS',
  tbilissi: 'TBS',
  batumi: 'BUS',
  kutaisi: 'KUT',
  dubai: 'DXB',
  'emirati arabi': 'DXB',
  uae: 'DXB',
  kenya: 'NBO',
  nairobi: 'NBO',
  mombasa: 'MBA',
  malesia: 'KUL',
  malaysia: 'KUL',
  'kuala lumpur': 'KUL',
  vietnam: 'SGN',
  'ho chi minh': 'SGN',
  hanoi: 'HAN',
  cambogia: 'PNH',
  cambodia: 'PNH',
  'siem reap': 'REP',
  sri_lanka: 'CMB',
  'sri lanka': 'CMB',
  colombo: 'CMB',
  maldive: 'MLE',
  maldives: 'MLE',
  islanda: 'REK',
  iceland: 'REK',
  norvegia: 'OSL',
  norway: 'OSL',
  oslo: 'OSL',
  svezia: 'STO',
  sweden: 'STO',
  stockholm: 'STO',
  portogallo_algarve: 'FAO',
  algarve: 'FAO',
  canarie: 'LPA',
  'isole canarie': 'LPA',
  tenerife: 'TFS',
  'costa rica': 'SJO',
  messico: 'MEX',
  mexico: 'MEX',
  cancun: 'CUN',
  cuba: 'HAV',
  havana: 'HAV',
  peru: 'LIM',
  perù: 'LIM',
  lima: 'LIM',
  machu_picchu: 'CUZ',
  cusco: 'CUZ',
  brasile: 'RIO',
  brazil: 'RIO',
  'rio de janeiro': 'RIO',
  argentina: 'BUE',
  'buenos aires': 'BUE',
  australia: 'SYD',
  sydney: 'SYD',
  melbourne: 'MEL',
  'nuova zelanda': 'AKL',
  'new zealand': 'AKL',
  auckland: 'AKL',
  india: 'DEL',
  delhi: 'DEL',
  mumbai: 'BOM',
  goa: 'GOI',
  cina: 'PEK',
  china: 'PEK',
  pechino: 'PEK',
  beijing: 'PEK',
  shanghai: 'SHA',
  'hong kong': 'HKG',
  singapore: 'SIN',
  'corea del sud': 'SEL',
  'south korea': 'SEL',
  seoul: 'SEL',
};

function normalizeDestination(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Risolve un testo destinazione (es. "Thailandia", "Bangkok, Thailandia") in codice IATA.
 * Restituisce null se non trovato — in quel caso il link WL apre il form vuoto.
 */
export function resolveDestinationIata(destination: string): string | null {
  if (!destination?.trim()) return null;

  const normalized = normalizeDestination(destination);

  if (/^[A-Z]{3}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (DESTINATION_IATA[normalized]) {
    return DESTINATION_IATA[normalized];
  }

  const parts = normalized.split(/[,/|-]/).map((p) => p.trim());
  for (const part of parts) {
    if (DESTINATION_IATA[part]) return DESTINATION_IATA[part];
  }

  // Solo se la query contiene una chiave nota completa (es. "Tokyo, Giappone"),
  // mai prefissi parziali tipo "toky" → Tokyo.
  for (const [key, iata] of Object.entries(DESTINATION_IATA)) {
    if (key.length >= 4 && normalized.includes(key)) {
      return iata;
    }
  }

  return null;
}

/** Scalo reale per LiteAPI: paese/ISO2/metro → primo aeroporto (AE → DXB, TYO → HND). */
export function resolveFlightDestinationIata(destination: string): string | null {
  const trimmed = destination.trim();
  if (!trimmed) return null;

  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return primaryAirportsForCountry(trimmed)[0]?.iata ?? null;
  }

  if (/^[A-Za-z]{3}$/.test(trimmed)) {
    const expanded = expandOriginIata(trimmed);
    return expanded[0] ?? trimmed.toUpperCase();
  }

  const mapped = resolveDestinationIata(trimmed);
  if (mapped) {
    return expandOriginIata(mapped)[0] ?? mapped;
  }

  const country = matchCountryOnly(trimmed);
  if (country) {
    return primaryAirportsForCountry(country.code)[0]?.iata ?? null;
  }

  const city = trimmed.split(/[,·]/)[0]?.trim() || trimmed;
  return findAirportsForCity(city)[0]?.iata ?? null;
}