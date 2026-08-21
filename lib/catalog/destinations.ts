import seed from '@/lib/catalog/excel-seed.json';

export type CatalogDestination = {
  id: string;
  slug: string;
  name: string;
  country: string;
  continent: string;
  allowedDurations: number[];
  typicalDepartureAirportsIt: string[];
  rationale?: string;
  hotelLogic?: string;
  active: boolean;
  emoji: string;
  vibe: string;
  gradient: string;
  lat: number;
  lng: number;
  countryCode?: string;
};

const IT_HUBS = ['FCO', 'MXP', 'LIN', 'BGY', 'VCE', 'NAP', 'BLQ', 'PSA', 'CTA', 'PMO'];

/** Destinazioni-nazione dal foglio Excel (Bali → Indonesia, Dubai → Emirati). */
export const CATALOG_DESTINATIONS: CatalogDestination[] = seed.destinations.map((d) => ({
  ...d,
  typicalDepartureAirportsIt: IT_HUBS,
}));

export function findCatalogDestination(idOrSlug: string): CatalogDestination | undefined {
  const key = idOrSlug.trim().toLowerCase();
  return CATALOG_DESTINATIONS.find(
    (d) => d.id === key || d.slug === key || d.name.toLowerCase() === key || d.country.toLowerCase() === key
  );
}

export function activeCatalogDestinations(): CatalogDestination[] {
  return CATALOG_DESTINATIONS.filter((d) => d.active);
}

/** Wizard Crea: tutte le nazioni del catalogo, seed di lancio in testa. */
export function wizardCatalogDestinations(): CatalogDestination[] {
  return [...CATALOG_DESTINATIONS].sort((a, b) => Number(b.active) - Number(a.active));
}

export const CATALOG_CONTINENTS = ['Europa', 'Asia', 'Africa', 'Americhe', 'Oceania'] as const;
