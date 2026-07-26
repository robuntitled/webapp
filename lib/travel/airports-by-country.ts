/** Aeroporti principali per paese — ricerca “partenza: Italia” → multi-IATA. */

export type CountryAirportGroup = {
  code: string;
  label: string;
  airports: string[];
};

export const COUNTRY_AIRPORTS: CountryAirportGroup[] = [
  {
    code: 'IT',
    label: 'Italia',
    airports: ['FCO', 'MXP', 'LIN', 'BGY', 'VCE', 'NAP', 'BLQ', 'PSA', 'CTA', 'PMO', 'BRI', 'TRN'],
  },
  {
    code: 'JP',
    label: 'Giappone',
    airports: ['HND', 'NRT', 'KIX', 'ITM', 'NGO', 'FUK', 'CTS', 'OKA'],
  },
  {
    code: 'FR',
    label: 'Francia',
    airports: ['CDG', 'ORY', 'NCE', 'LYS', 'MRS', 'TLS'],
  },
  {
    code: 'ES',
    label: 'Spagna',
    airports: ['MAD', 'BCN', 'AGP', 'PMI', 'ALC', 'VLC'],
  },
  {
    code: 'DE',
    label: 'Germania',
    airports: ['FRA', 'MUC', 'BER', 'DUS', 'HAM', 'CGN'],
  },
  {
    code: 'GB',
    label: 'Regno Unito',
    airports: ['LHR', 'LGW', 'STN', 'MAN', 'EDI', 'BHX'],
  },
  {
    code: 'PT',
    label: 'Portogallo',
    airports: ['LIS', 'OPO', 'FAO'],
  },
  {
    code: 'NL',
    label: 'Paesi Bassi',
    airports: ['AMS', 'EIN', 'RTM'],
  },
  {
    code: 'GR',
    label: 'Grecia',
    airports: ['ATH', 'SKG', 'HER', 'JTR'],
  },
  {
    code: 'US',
    label: 'Stati Uniti',
    airports: ['JFK', 'EWR', 'LAX', 'ORD', 'MIA', 'SFO', 'BOS'],
  },
  {
    code: 'TH',
    label: 'Thailandia',
    airports: ['BKK', 'DMK', 'HKT', 'CNX'],
  },
  {
    code: 'AE',
    label: 'Emirati',
    airports: ['DXB', 'AUH'],
  },
];

const COUNTRY_ALIASES: Record<string, string> = {
  italia: 'IT',
  italy: 'IT',
  it: 'IT',
  francia: 'FR',
  france: 'FR',
  fr: 'FR',
  spagna: 'ES',
  spain: 'ES',
  es: 'ES',
  germania: 'DE',
  germany: 'DE',
  de: 'DE',
  'regno unito': 'GB',
  uk: 'GB',
  england: 'GB',
  gb: 'GB',
  portogallo: 'PT',
  portugal: 'PT',
  pt: 'PT',
  olanda: 'NL',
  netherlands: 'NL',
  nl: 'NL',
  grecia: 'GR',
  greece: 'GR',
  gr: 'GR',
  usa: 'US',
  'stati uniti': 'US',
  us: 'US',
  emirati: 'AE',
  uae: 'AE',
  dubai: 'AE',
  ae: 'AE',
  giappone: 'JP',
  japan: 'JP',
  jp: 'JP',
  thailandia: 'TH',
  thailand: 'TH',
  th: 'TH',
};

export function normalizeCountryCode(input: string): string | null {
  const key = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (!key) return null;
  if (/^[a-z]{2}$/.test(key)) {
    const upper = key.toUpperCase();
    return COUNTRY_AIRPORTS.some((c) => c.code === upper) ? upper : null;
  }
  return COUNTRY_ALIASES[key] ?? null;
}

export function airportsForCountry(country: string): string[] {
  const code = normalizeCountryCode(country);
  if (!code) return [];
  return COUNTRY_AIRPORTS.find((c) => c.code === code)?.airports ?? [];
}

/** Se input è paese → lista aeroporti; se IATA/città → singolo. */
export function resolveOriginAirports(
  originInput: string,
  resolveCityIata?: (label: string) => string | null
): string[] {
  const trimmed = originInput.trim();
  if (!trimmed) return [];
  const countryAirports = airportsForCountry(trimmed);
  if (countryAirports.length) return countryAirports;
  if (/^[A-Za-z]{3}$/.test(trimmed)) return [trimmed.toUpperCase()];
  const city = resolveCityIata?.(trimmed);
  return city ? [city.toUpperCase()] : [];
}
