import {
  CATALOG_DESTINATIONS,
  findCatalogDestination,
  wizardCatalogDestinations,
  type CatalogDestination,
} from '@/lib/catalog/destinations';
import seed from '@/lib/catalog/excel-seed.json';

export type CatalogDay = {
  day: number;
  title: string;
  highlights: string;
  area: string;
  paid: string;
  arrival: boolean;
  departure: boolean;
};

export type CatalogTemplate = {
  id: string;
  destinationId: string;
  durationDays: number;
  title: string;
  summary: string;
  label: string;
  vibe: string;
  emoji: string;
  gradient: string;
  region: string;
  featured?: boolean;
  status: 'published';
  days: CatalogDay[];
};

export function templateIdFor(destinationId: string, durationDays: number): string {
  return `${destinationId}-${durationDays}`;
}

function daysFor(destinationId: string, durationDays: number): CatalogDay[] {
  const raw = (seed.days as Record<string, CatalogDay[]>)[templateIdFor(destinationId, durationDays)] ?? [];
  return raw;
}

function templateRecord(
  dest: CatalogDestination,
  durationDays: number,
  featured: boolean
): CatalogTemplate {
  return {
    id: templateIdFor(dest.id, durationDays),
    destinationId: dest.id,
    durationDays,
    title: dest.name,
    summary: dest.rationale || dest.vibe,
    label: dest.name,
    vibe: dest.vibe,
    emoji: dest.emoji,
    gradient: dest.gradient,
    region: dest.continent,
    featured,
    status: 'published',
    days: daysFor(dest.id, durationDays),
  };
}

export function buildCatalogTemplates(
  destinations = wizardCatalogDestinations()
): CatalogTemplate[] {
  const out: CatalogTemplate[] = [];
  destinations.forEach((dest, destIndex) => {
    dest.allowedDurations.forEach((durationDays, durIndex) => {
      out.push(templateRecord(dest, durationDays, dest.active && destIndex < 4 && durIndex === 0));
    });
  });
  return out;
}

export const CATALOG_TEMPLATES: CatalogTemplate[] = buildCatalogTemplates(CATALOG_DESTINATIONS);

export function findCatalogTemplate(id: string): CatalogTemplate | undefined {
  const direct = CATALOG_TEMPLATES.find((t) => t.id === id);
  if (direct) return direct;
  const match = /^(.+)-(\d+)$/.exec(id);
  if (!match) return undefined;
  const dest = findCatalogDestination(match[1]);
  const durationDays = Number(match[2]);
  if (!dest || !dest.allowedDurations.includes(durationDays)) return undefined;
  return templateRecord(dest, durationDays, false);
}

export function templatesForDestination(destinationId: string): CatalogTemplate[] {
  return CATALOG_TEMPLATES.filter((t) => t.destinationId === destinationId);
}
