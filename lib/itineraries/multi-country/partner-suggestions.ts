/**
 * Suggestions when adding another destination in Organizza Dove.
 * Curated pairs first, then same-continent catalog neighbours (no invented links).
 */

import { findCatalogDestination } from '@/lib/catalog/destinations';
import {
  curatedPartnersFor,
  findCuratedPair,
} from '@/lib/itineraries/multi-country/curated-pairs';
import type { CuratedMultiCountryPair } from '@/lib/itineraries/multi-country/types';
import { getMaster } from '@/lib/itineraries/masters/registry';

export type PartnerSuggestion = {
  slug: string;
  name: string;
  vibe: string;
  emoji: string;
  kind: 'curated' | 'neighbour';
  pair?: CuratedMultiCountryPair;
  blurbIt: string;
};

export function suggestPartnersFor(
  firstSlug: string,
  catalog: Array<{
    slug: string;
    name: string;
    vibe: string;
    emoji: string;
    published?: boolean;
  }>,
  opts?: { limit?: number }
): PartnerSuggestion[] {
  const limit = opts?.limit ?? 8;
  const first = firstSlug.trim().toLowerCase();
  const out: PartnerSuggestion[] = [];
  const seen = new Set<string>([first]);

  for (const pair of curatedPartnersFor(first)) {
    const other = pair.slugs[0] === first ? pair.slugs[1] : pair.slugs[0];
    if (seen.has(other)) continue;
    if (!getMaster(other)) continue;
    const card = catalog.find((d) => d.slug === other);
    if (!card || card.published === false) continue;
    seen.add(other);
    out.push({
      slug: other,
      name: card.name,
      vibe: card.vibe,
      emoji: card.emoji,
      kind: 'curated',
      pair,
      blurbIt: pair.blurbIt,
    });
  }

  const firstCat = findCatalogDestination(first);
  const continent = firstCat?.continent;
  if (continent) {
    for (const card of catalog) {
      if (out.length >= limit) break;
      if (seen.has(card.slug) || card.published === false) continue;
      if (!getMaster(card.slug)) continue;
      const cat = findCatalogDestination(card.slug);
      if (cat?.continent !== continent) continue;
      // Skip if already a curated partner (already added)
      if (findCuratedPair(first, card.slug)) continue;
      seen.add(card.slug);
      out.push({
        slug: card.slug,
        name: card.name,
        vibe: card.vibe,
        emoji: card.emoji,
        kind: 'neighbour',
        blurbIt: `Stessa area (${continent}). Combinazione libera: verifica i collegamenti.`,
      });
    }
  }

  return out.slice(0, limit);
}
