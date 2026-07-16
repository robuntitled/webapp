import type { ComposerDraft, DestinationMeta } from '@/types/composer';
import { generateTripTitle } from '@/lib/composer/title-generator';

export function getDraftDestinations(draft: ComposerDraft): DestinationMeta[] {
  if (draft.destinations?.length) return draft.destinations;
  if (draft.destinationMeta) return [draft.destinationMeta];
  return [];
}

export function syncDestinationFields(
  destinations: DestinationMeta[],
  currentTitle?: string
): Pick<ComposerDraft, 'destinations' | 'destination' | 'destinationMeta' | 'title'> {
  if (destinations.length === 0) {
    return {
      destinations: [],
      destination: '',
      destinationMeta: undefined,
      title: '',
    };
  }
  const destination = destinations.map((d) => d.label).join(' · ');
  const primary = destinations[0];
  const title =
    currentTitle && currentTitle.length > 0
      ? currentTitle
      : generateTripTitle(primary.label, `${primary.label}-${Date.now()}`);
  return {
    destinations,
    destination,
    destinationMeta: primary,
    title,
  };
}