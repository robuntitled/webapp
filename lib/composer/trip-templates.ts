import { addDays, format, parseISO } from 'date-fns';
import { featuredToMeta } from '@/lib/composer/destinations';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { createBlockId } from '@/lib/composer/blocks';
import { inferTimeSlotForType } from '@/lib/composer/time-slots';
import {
  CATALOG_TEMPLATES,
  findCatalogTemplate,
  type CatalogDay,
  type CatalogTemplate,
} from '@/lib/catalog/templates';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { ComposerBlock, ComposerDay, ComposerDraft } from '@/types/composer';

export type TripTemplate = CatalogTemplate;

export const TRIP_TEMPLATES: TripTemplate[] = CATALOG_TEMPLATES;

export function findTripTemplate(id: string): TripTemplate | undefined {
  return findCatalogTemplate(id);
}

function blocksFromCatalogDay(day: CatalogDay, index: number, total: number): ComposerBlock[] {
  const blocks: ComposerBlock[] = [];
  const slot = day.arrival ? 'afternoon' : day.departure ? 'morning' : inferTimeSlotForType('attraction');
  blocks.push({
    id: createBlockId(),
    type: 'attraction',
    sortOrder: 0,
    content: {
      title: day.title,
      note: day.highlights,
      area: day.area,
      timeSlot: slot,
    },
    alternatives: [],
    selectedAlternativeId: null,
  });
  if (day.paid) {
    blocks.push({
      id: createBlockId(),
      type: 'activity',
      sortOrder: 1,
      content: {
        title: day.paid,
        area: day.area,
        timeSlot: 'afternoon',
        paidHint: true,
      },
      alternatives: [],
      selectedAlternativeId: null,
    });
  }
  if (!day.paid && !day.arrival && !day.departure && index > 0 && index < total - 1) {
    blocks.push({
      id: createBlockId(),
      type: 'free_time',
      sortOrder: 1,
      content: { title: day.highlights || 'Tempo libero', timeSlot: 'afternoon' },
      alternatives: [],
      selectedAlternativeId: null,
    });
  }
  return blocks;
}

export function draftFromTripTemplate(
  template: TripTemplate,
  startDate: string
): Partial<ComposerDraft> {
  const dest = findCatalogDestination(template.destinationId);
  if (!dest) return {};
  const start = parseISO(startDate);
  const end = addDays(start, template.durationDays - 1);
  const meta = featuredToMeta({
    id: dest.id,
    label: dest.name,
    emoji: dest.emoji,
    region: dest.continent,
    vibe: dest.vibe,
    gradient: dest.gradient,
    lat: dest.lat,
    lng: dest.lng,
    countryCode: dest.countryCode,
  });
  const catalogDays =
    template.days.length === template.durationDays
      ? template.days
      : Array.from({ length: template.durationDays }, (_, i) => ({
          day: i + 1,
          title: i === 0 ? 'Arrivo' : i === template.durationDays - 1 ? 'Partenza' : `Giorno ${i + 1}`,
          highlights: dest.vibe,
          area: dest.name,
          paid: '',
          arrival: i === 0,
          departure: i === template.durationDays - 1,
        }));

  const days: ComposerDay[] = catalogDays.map((day, index) => ({
    dayIndex: index + 1,
    date: format(addDays(start, index), 'yyyy-MM-dd'),
    title: day.title,
    blocks: blocksFromCatalogDay(day, index, catalogDays.length),
  }));

  const title = dest.name.length >= 12 ? dest.name : `Viaggio in ${dest.name}`;

  return {
    title,
    destination: dest.name,
    destinationMeta: meta,
    destinations: [meta],
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
    imageUrl: coverForDestination(dest.id),
    days,
    templateId: template.id,
    catalogDestinationId: dest.id,
    durationDays: template.durationDays,
    hotelRule: 'A',
    planningMode: 'solo',
    budgetHint: 900,
  };
}
