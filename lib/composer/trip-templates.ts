import { addDays, format, parseISO } from 'date-fns';
import { featuredToMeta } from '@/lib/composer/destinations';
import { coverForDestination } from '@/lib/composer/destination-covers';
import { DAY_TEMPLATES } from '@/lib/composer/day-templates';
import { createBlockId } from '@/lib/composer/blocks';
import { inferTimeSlotForType } from '@/lib/composer/time-slots';
import {
  CATALOG_TEMPLATES,
  findCatalogTemplate,
  type CatalogTemplate,
} from '@/lib/catalog/templates';
import { findCatalogDestination } from '@/lib/catalog/destinations';
import type { ComposerBlock, ComposerBlockType, ComposerDay, ComposerDraft } from '@/types/composer';

export type TripTemplate = CatalogTemplate;

/** Template attivi per meta × durata consentita. */
export const TRIP_TEMPLATES: TripTemplate[] = CATALOG_TEMPLATES;

export function findTripTemplate(id: string): TripTemplate | undefined {
  return findCatalogTemplate(id);
}

function blockFromDayTemplate(
  type: ComposerBlockType,
  title: string,
  timeSlot: string | undefined,
  sortOrder: number
): ComposerBlock {
  return {
    id: createBlockId(),
    type,
    sortOrder,
    content: { title, timeSlot: timeSlot ?? inferTimeSlotForType(type) },
    alternatives: [],
    selectedAlternativeId: null,
  };
}

function daysForDuration(durationDays: number): ComposerDay['title'][] {
  const explore = DAY_TEMPLATES.find((t) => t.id === 'explore');
  const culture = DAY_TEMPLATES.find((t) => t.id === 'culture');
  const relax = DAY_TEMPLATES.find((t) => t.id === 'relax');
  const arrival = DAY_TEMPLATES.find((t) => t.id === 'arrival');
  const departure = DAY_TEMPLATES.find((t) => t.id === 'departure');
  const mid = [explore, culture, relax].filter(Boolean);
  const titles: string[] = [];
  for (let i = 0; i < durationDays; i++) {
    if (i === 0) titles.push(arrival?.label ?? 'Arrivo');
    else if (i === durationDays - 1) titles.push(departure?.label ?? 'Partenza');
    else titles.push(mid[(i - 1) % mid.length]?.label ?? 'Esplorazione');
  }
  return titles;
}

function blocksForDayIndex(index: number, total: number): ComposerBlock[] {
  const templateId =
    index === 0 ? 'arrival' : index === total - 1 ? 'departure' : index % 3 === 1 ? 'explore' : index % 3 === 2 ? 'culture' : 'relax';
  const template = DAY_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return [];
  return template.blocks.map((b, i) => blockFromDayTemplate(b.type, b.title, b.timeSlot, i));
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
  const days: ComposerDay[] = Array.from({ length: template.durationDays }, (_, index) => ({
    dayIndex: index + 1,
    date: format(addDays(start, index), 'yyyy-MM-dd'),
    title: daysForDuration(template.durationDays)[index] ?? `Giorno ${index + 1}`,
    blocks: blocksForDayIndex(index, template.durationDays),
  }));

  return {
    title: template.title,
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
  };
}
