/** Inferisce città + country code ISO da una stringa destinazione (es. "Roma, Italia"). */

const CITY_COUNTRY: Record<string, string> = {
  roma: 'IT',
  rome: 'IT',
  milano: 'IT',
  milan: 'IT',
  napoli: 'IT',
  naples: 'IT',
  firenze: 'IT',
  florence: 'IT',
  venezia: 'IT',
  venice: 'IT',
  italia: 'IT',
  italy: 'IT',
  parigi: 'FR',
  paris: 'FR',
  francia: 'FR',
  france: 'FR',
  barcellona: 'ES',
  barcelona: 'ES',
  madrid: 'ES',
  spagna: 'ES',
  spain: 'ES',
  lisbona: 'PT',
  lisbon: 'PT',
  portogallo: 'PT',
  portugal: 'PT',
  atene: 'GR',
  athens: 'GR',
  grecia: 'GR',
  greece: 'GR',
  berlino: 'DE',
  berlin: 'DE',
  germania: 'DE',
  germany: 'DE',
  londra: 'GB',
  london: 'GB',
  amsterdam: 'NL',
  bangkok: 'TH',
  thailandia: 'TH',
  thailand: 'TH',
  dubai: 'AE',
  tokyo: 'JP',
  giappone: 'JP',
  japan: 'JP',
  newyork: 'US',
  'new york': 'US',
};

const COUNTRY_ONLY: Record<string, string> = {
  italia: 'IT',
  italy: 'IT',
  francia: 'FR',
  france: 'FR',
  spagna: 'ES',
  spain: 'ES',
  portogallo: 'PT',
  portugal: 'PT',
  grecia: 'GR',
  greece: 'GR',
  germania: 'DE',
  germany: 'DE',
  'regno unito': 'GB',
  uk: 'GB',
  thailandia: 'TH',
  thailand: 'TH',
  giappone: 'JP',
  japan: 'JP',
  usa: 'US',
  'stati uniti': 'US',
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

export function guessCityFromDestination(destination: string): string {
  const raw = destination.trim();
  if (!raw) return 'Roma';
  return raw.split(/[,/|–—-]/)[0]?.trim() || raw;
}

export function guessCountryCodeFromDestination(destination: string): string {
  const normalized = normalize(destination);
  if (!normalized) return 'IT';

  for (const [key, code] of Object.entries(COUNTRY_ONLY)) {
    if (normalized.includes(key)) return code;
  }

  const city = normalize(guessCityFromDestination(destination));
  if (CITY_COUNTRY[city]) return CITY_COUNTRY[city];

  for (const [key, code] of Object.entries(CITY_COUNTRY)) {
    if (city.includes(key) || key.includes(city)) return code;
  }

  return 'IT';
}
