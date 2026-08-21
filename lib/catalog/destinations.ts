import { COMPOSER_DESTINATIONS } from '@/lib/composer/destinations';
import { defaultDurationsForContinent, LAUNCH_ACTIVE_LIMIT } from '@/lib/catalog/durations';

export type CatalogDestination = {
  id: string;
  slug: string;
  name: string;
  country: string;
  continent: string;
  allowedDurations: number[];
  typicalDepartureAirportsIt: string[];
  active: boolean;
  emoji: string;
  vibe: string;
  gradient: string;
  lat: number;
  lng: number;
  countryCode?: string;
};

const IT_HUBS = ['FCO', 'MXP', 'LIN', 'BGY', 'VCE', 'NAP', 'BLQ', 'PSA', 'CTA', 'PMO'];

/** Override durate per meta specifiche (spec §8). */
const DURATION_OVERRIDES: Record<string, number[]> = {
  maldive: [7, 10],
  sicilia: [5, 7, 10],
  sardegna: [5, 7, 10],
  canarie: [5, 7, 10],
};

function countryFromRegion(region: string, label: string): string {
  if (region === label) return label;
  return label;
}

export const CATALOG_DESTINATIONS: CatalogDestination[] = COMPOSER_DESTINATIONS.map((dest, index) => {
  const continent = dest.region;
  const allowedDurations =
    DURATION_OVERRIDES[dest.id] ?? defaultDurationsForContinent(continent);
  return {
    id: dest.id,
    slug: dest.id,
    name: dest.label,
    country: countryFromRegion(dest.region, dest.label),
    continent,
    allowedDurations,
    typicalDepartureAirportsIt: IT_HUBS,
    active: index < LAUNCH_ACTIVE_LIMIT,
    emoji: dest.emoji,
    vibe: dest.vibe,
    gradient: dest.gradient,
    lat: dest.lat,
    lng: dest.lng,
    countryCode: dest.countryCode,
  };
});

export function findCatalogDestination(idOrSlug: string): CatalogDestination | undefined {
  const key = idOrSlug.trim().toLowerCase();
  return CATALOG_DESTINATIONS.find((d) => d.id === key || d.slug === key || d.name.toLowerCase() === key);
}

export function activeCatalogDestinations(): CatalogDestination[] {
  return CATALOG_DESTINATIONS.filter((d) => d.active);
}
