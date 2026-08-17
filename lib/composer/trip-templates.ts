import { addDays, format, parseISO } from 'date-fns';
import { COMPOSER_DESTINATIONS, featuredToMeta } from '@/lib/composer/destinations';
import { DAY_TEMPLATES } from '@/lib/composer/day-templates';
import { createBlockId } from '@/lib/composer/blocks';
import { inferTimeSlotForType } from '@/lib/composer/time-slots';
import type { ComposerBlock, ComposerBlockType, ComposerDay, ComposerDraft } from '@/types/composer';

export type TripTemplate = {
  id: string;
  destinationId: string;
  durationDays: 5 | 7 | 10;
  label: string;
  vibe: string;
  emoji: string;
  gradient: string;
  region: string;
  featured?: boolean;
};

const DURATION_CYCLE: Array<5 | 7 | 10> = [7, 5, 10, 7, 5];

export const TRIP_TEMPLATES: TripTemplate[] = COMPOSER_DESTINATIONS.slice(0, 10).map(
  (dest, index) => {
    const durationDays = DURATION_CYCLE[index % DURATION_CYCLE.length] ?? 7;
    return {
      id: `${dest.id}-${durationDays}`,
      destinationId: dest.id,
      durationDays,
      label: `${dest.label} · ${durationDays} giorni`,
      vibe: dest.vibe,
      emoji: dest.emoji,
      gradient: dest.gradient,
      region: dest.region,
      featured: index < 4,
    };
  }
);

export function findTripTemplate(id: string): TripTemplate | undefined {
  return TRIP_TEMPLATES.find((t) => t.id === id);
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
  const dest = COMPOSER_DESTINATIONS.find((d) => d.id === template.destinationId);
  if (!dest) return {};
  const start = parseISO(startDate);
  const end = addDays(start, template.durationDays - 1);
  const meta = featuredToMeta(dest);
  const days: ComposerDay[] = Array.from({ length: template.durationDays }, (_, index) => ({
    dayIndex: index + 1,
    date: format(addDays(start, index), 'yyyy-MM-dd'),
    title: daysForDuration(template.durationDays)[index] ?? `Giorno ${index + 1}`,
    blocks: blocksForDayIndex(index, template.durationDays),
  }));

  return {
    title: `${dest.label} in ${template.durationDays} giorni`,
    destination: dest.label,
    destinationMeta: meta,
    destinations: [meta],
    startDate,
    endDate: format(end, 'yyyy-MM-dd'),
    planningMode: 'solo',
    minParticipants: 4,
    maxParticipants: 8,
    days,
  };
}
