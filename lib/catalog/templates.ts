import { activeCatalogDestinations, findCatalogDestination, type CatalogDestination } from '@/lib/catalog/destinations';

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
};

export function templateIdFor(destinationId: string, durationDays: number): string {
  return `${destinationId}-${durationDays}`;
}

export function buildCatalogTemplates(destinations = activeCatalogDestinations()): CatalogTemplate[] {
  const out: CatalogTemplate[] = [];
  destinations.forEach((dest, destIndex) => {
    dest.allowedDurations.forEach((durationDays, durIndex) => {
      out.push(templateRecord(dest, durationDays, destIndex < 4 && durIndex === 0));
    });
  });
  return out;
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
    title: `${dest.name} · ${durationDays} giorni`,
    summary: `${dest.vibe}. Itinerario curato NomadLink, ${durationDays} giorni.`,
    label: `${dest.name} · ${durationDays} giorni`,
    vibe: dest.vibe,
    emoji: dest.emoji,
    gradient: dest.gradient,
    region: dest.continent,
    featured,
    status: 'published',
  };
}

export const CATALOG_TEMPLATES: CatalogTemplate[] = buildCatalogTemplates();

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
