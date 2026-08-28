import { findCatalogDestination } from '@/lib/catalog/destinations';
import { findItineraryTemplate } from '@/lib/itineraries/catalog';
import type { OfficialEditionCard } from '@/lib/itineraries/types';

export type PublicDestinationSummary = {
  slug: string;
  name: string;
  editionCount: number;
};

export function editionDestinationSlug(ed: OfficialEditionCard): string {
  const tpl = findItineraryTemplate(ed.template_id);
  return tpl?.destination_slug ?? ed.template_id.split('-')[0] ?? '';
}

export function editionDestinationName(ed: OfficialEditionCard): string {
  const tpl = findItineraryTemplate(ed.template_id);
  const slug = editionDestinationSlug(ed);
  const dest = findCatalogDestination(slug);
  return tpl?.destination_name ?? dest?.name ?? slug;
}

/** Aggrega le partenze pubbliche per destinazione (slug → conteggio). */
export function aggregatePublicDestinations(
  editions: OfficialEditionCard[]
): PublicDestinationSummary[] {
  const bySlug = new Map<string, { name: string; count: number }>();

  for (const ed of editions) {
    const slug = editionDestinationSlug(ed);
    if (!slug) continue;
    const name = editionDestinationName(ed);
    const prev = bySlug.get(slug);
    if (prev) prev.count += 1;
    else bySlug.set(slug, { name, count: 1 });
  }

  return [...bySlug.entries()]
    .map(([slug, { name, count }]) => ({
      slug,
      name,
      editionCount: count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
}

export function filterEditionsByDestinationSlug(
  editions: OfficialEditionCard[],
  slug: string
): OfficialEditionCard[] {
  return editions.filter((ed) => editionDestinationSlug(ed) === slug);
}

export function partenzeCtaLabel(count: number): string {
  return count === 1 ? 'Vedi 1 partenza' : `Vedi ${count} partenze`;
}
