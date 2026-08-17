import {
  CONTINENT_COUNTRIES,
  isSearchableCountry,
  type DestinationRegion,
} from '@/lib/composer/continent-countries';
import type { ComposerDestination, DestinationMeta } from '@/types/composer';

type MajorCity = {
  label: string;
  country: string;
  region: DestinationRegion;
  lat: number;
  lng: number;
};

const MAJOR_CITIES: MajorCity[] = [
  { label: 'Roma', country: 'Italia', region: 'Europa', lat: 41.9028, lng: 12.4964 },
  { label: 'Milano', country: 'Italia', region: 'Europa', lat: 45.4642, lng: 9.19 },
  { label: 'Napoli', country: 'Italia', region: 'Europa', lat: 40.8518, lng: 14.2681 },
  { label: 'Londra', country: 'Regno Unito', region: 'Europa', lat: 51.5074, lng: -0.1278 },
  { label: 'Parigi', country: 'Francia', region: 'Europa', lat: 48.8566, lng: 2.3522 },
  { label: 'Barcellona', country: 'Spagna', region: 'Europa', lat: 41.3874, lng: 2.1686 },
  { label: 'Madrid', country: 'Spagna', region: 'Europa', lat: 40.4168, lng: -3.7038 },
  { label: 'Lisbona', country: 'Portogallo', region: 'Europa', lat: 38.7223, lng: -9.1393 },
  { label: 'Amsterdam', country: 'Paesi Bassi', region: 'Europa', lat: 52.3676, lng: 4.9041 },
  { label: 'Berlino', country: 'Germania', region: 'Europa', lat: 52.52, lng: 13.405 },
  { label: 'Monaco di Baviera', country: 'Germania', region: 'Europa', lat: 48.1351, lng: 11.582 },
  { label: 'Vienna', country: 'Austria', region: 'Europa', lat: 48.2082, lng: 16.3738 },
  { label: 'Atene', country: 'Grecia', region: 'Europa', lat: 37.9838, lng: 23.7275 },
  { label: 'Zurigo', country: 'Svizzera', region: 'Europa', lat: 47.3769, lng: 8.5417 },
  { label: 'Praga', country: 'Cechia', region: 'Europa', lat: 50.0755, lng: 14.4378 },
  { label: 'Budapest', country: 'Ungheria', region: 'Europa', lat: 47.4979, lng: 19.0402 },
  { label: 'Varsavia', country: 'Polonia', region: 'Europa', lat: 52.2297, lng: 21.0122 },
  { label: 'Stoccolma', country: 'Svezia', region: 'Europa', lat: 59.3293, lng: 18.0686 },
  { label: 'Copenaghen', country: 'Danimarca', region: 'Europa', lat: 55.6761, lng: 12.5683 },
  { label: 'Dublino', country: 'Irlanda', region: 'Europa', lat: 53.3498, lng: -6.2603 },
  { label: 'Istanbul', country: 'Turchia', region: 'Medio Oriente', lat: 41.0082, lng: 28.9784 },
  { label: 'Dubai', country: 'Emirati Arabi', region: 'Medio Oriente', lat: 25.2048, lng: 55.2708 },
  { label: 'Abu Dhabi', country: 'Emirati Arabi', region: 'Medio Oriente', lat: 24.4539, lng: 54.3773 },
  { label: 'Doha', country: 'Qatar', region: 'Medio Oriente', lat: 25.2854, lng: 51.531 },
  { label: 'Tel Aviv', country: 'Israele', region: 'Medio Oriente', lat: 32.0853, lng: 34.7818 },
  { label: 'Tokyo', country: 'Giappone', region: 'Asia', lat: 35.6762, lng: 139.6503 },
  { label: 'Osaka', country: 'Giappone', region: 'Asia', lat: 34.6937, lng: 135.5023 },
  { label: 'Seoul', country: 'Corea del Sud', region: 'Asia', lat: 37.5665, lng: 126.978 },
  { label: 'Pechino', country: 'Cina', region: 'Asia', lat: 39.9042, lng: 116.4074 },
  { label: 'Shanghai', country: 'Cina', region: 'Asia', lat: 31.2304, lng: 121.4737 },
  { label: 'Hong Kong', country: 'Cina', region: 'Asia', lat: 22.3193, lng: 114.1694 },
  { label: 'Bangkok', country: 'Thailandia', region: 'Asia', lat: 13.7563, lng: 100.5018 },
  { label: 'Singapore', country: 'Singapore', region: 'Asia', lat: 1.3521, lng: 103.8198 },
  { label: 'Kuala Lumpur', country: 'Malesia', region: 'Asia', lat: 3.139, lng: 101.6869 },
  { label: 'Jakarta', country: 'Indonesia', region: 'Asia', lat: -6.2088, lng: 106.8456 },
  { label: 'Bali', country: 'Indonesia', region: 'Asia', lat: -8.4095, lng: 115.1889 },
  { label: 'Mumbai', country: 'India', region: 'Asia', lat: 19.076, lng: 72.8777 },
  { label: 'New Delhi', country: 'India', region: 'Asia', lat: 28.6139, lng: 77.209 },
  { label: 'Ho Chi Minh', country: 'Vietnam', region: 'Asia', lat: 10.8231, lng: 106.6297 },
  { label: 'Hanoi', country: 'Vietnam', region: 'Asia', lat: 21.0278, lng: 105.8342 },
  { label: 'Manila', country: 'Filippine', region: 'Asia', lat: 14.5995, lng: 120.9842 },
  { label: 'Sydney', country: 'Australia', region: 'Oceania', lat: -33.8688, lng: 151.2093 },
  { label: 'Melbourne', country: 'Australia', region: 'Oceania', lat: -37.8136, lng: 144.9631 },
  { label: 'Auckland', country: 'Nuova Zelanda', region: 'Oceania', lat: -36.8509, lng: 174.7645 },
  { label: 'New York', country: 'Stati Uniti', region: 'Americhe', lat: 40.7128, lng: -74.006 },
  { label: 'Los Angeles', country: 'Stati Uniti', region: 'Americhe', lat: 34.0522, lng: -118.2437 },
  { label: 'San Francisco', country: 'Stati Uniti', region: 'Americhe', lat: 37.7749, lng: -122.4194 },
  { label: 'Miami', country: 'Stati Uniti', region: 'Americhe', lat: 25.7617, lng: -80.1918 },
  { label: 'Chicago', country: 'Stati Uniti', region: 'Americhe', lat: 41.8781, lng: -87.6298 },
  { label: 'Toronto', country: 'Canada', region: 'Americhe', lat: 43.6532, lng: -79.3832 },
  { label: 'Città del Messico', country: 'Messico', region: 'Americhe', lat: 19.4326, lng: -99.1332 },
  { label: 'Rio de Janeiro', country: 'Brasile', region: 'Americhe', lat: -22.9068, lng: -43.1729 },
  { label: 'São Paulo', country: 'Brasile', region: 'Americhe', lat: -23.5558, lng: -46.6396 },
  { label: 'Buenos Aires', country: 'Argentina', region: 'Americhe', lat: -34.6037, lng: -58.3816 },
  { label: 'Lima', country: 'Perù', region: 'Americhe', lat: -12.0464, lng: -77.0428 },
  { label: 'Bogotá', country: 'Colombia', region: 'Americhe', lat: 4.711, lng: -74.0721 },
  { label: 'Il Cairo', country: 'Egitto', region: 'Africa', lat: 30.0444, lng: 31.2357 },
  { label: 'Marrakech', country: 'Marocco', region: 'Africa', lat: 31.6295, lng: -7.9811 },
  { label: 'Cape Town', country: 'Sudafrica', region: 'Africa', lat: -33.9249, lng: 18.4241 },
  { label: 'Nairobi', country: 'Kenya', region: 'Africa', lat: -1.2921, lng: 36.8219 },
  { label: 'Lagos', country: 'Nigeria', region: 'Africa', lat: 6.5244, lng: 3.3792 },
];

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export type MajorPlaceHit = DestinationMeta & { kind: 'country' | 'city' };

export function searchMajorPlaces(query: string, limit = 8): MajorPlaceHit[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const countries: MajorPlaceHit[] = CONTINENT_COUNTRIES.filter(
    (c) => isSearchableCountry(c.id) && normalize(c.label).includes(q)
  ).map((c) => ({
    kind: 'country' as const,
    label: c.label,
    lat: c.lat,
    lng: c.lng,
    country: c.label,
    subtitle: c.region,
    placeType: 'country',
    placeTypeLabel: 'Nazione',
  }));

  const cities: MajorPlaceHit[] = MAJOR_CITIES.filter(
    (c) => normalize(c.label).includes(q) || normalize(c.country).includes(q)
  ).map((c) => ({
    kind: 'city' as const,
    label: c.label,
    lat: c.lat,
    lng: c.lng,
    country: c.country,
    subtitle: c.country,
    placeType: 'city',
    placeTypeLabel: 'Città',
  }));

  const starts = (label: string) => normalize(label).startsWith(q);
  const ranked = [...countries, ...cities].sort((a, b) => {
    const as = starts(a.label) ? 0 : 1;
    const bs = starts(b.label) ? 0 : 1;
    if (as !== bs) return as - bs;
    if (a.kind !== b.kind) return a.kind === 'country' ? -1 : 1;
    return a.label.localeCompare(b.label, 'it');
  });

  return ranked.slice(0, limit);
}

export function countryToComposerDest(meta: DestinationMeta): ComposerDestination | undefined {
  return CONTINENT_COUNTRIES.find(
    (c) => c.label.toLowerCase() === meta.label.toLowerCase() || c.label.toLowerCase() === meta.country?.toLowerCase()
  );
}
