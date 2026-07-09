import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import type { ComposerDay } from '@/types/composer';

const DAY_TITLES = [
  'Arrivo e prime scoperte',
  'Cuore dell\'avventura',
  'Esplorazione libera',
  'Highlight del viaggio',
  'Cultura e sapori',
  'Relax e panorami',
  'Ultimo giorno da ricordare',
];

export function buildComposerDays(startDate: string, endDate: string): ComposerDay[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const total = differenceInCalendarDays(end, start) + 1;

  return Array.from({ length: Math.max(1, total) }, (_, index) => {
    const dayIndex = index + 1;
    const date = addDays(start, index);
    return {
      dayIndex,
      date: format(date, 'yyyy-MM-dd'),
      title: DAY_TITLES[index % DAY_TITLES.length] ?? `Giorno ${dayIndex}`,
      blocks: [],
    };
  });
}

export function formatComposerDayLabel(dateIso: string, dayIndex: number): string {
  const date = parseISO(dateIso);
  return `Giorno ${dayIndex} · ${format(date, 'EEE d MMM', { locale: it })}`;
}

export function estimateTripBudget(days: ComposerDay[]): number {
  let total = 0;
  for (const day of days) {
    for (const block of day.blocks) {
      const price =
        block.alternatives.find((a) => a.id === block.selectedAlternativeId)?.price ??
        (typeof block.content.price === 'number' ? block.content.price : 0);
      total += price ?? 0;
    }
  }
  return Math.max(total, 1);
}

export function buildTripDescriptionFromDays(days: ComposerDay[], destination: string): string {
  const lines = [`Itinerario ${destination} — composito giorno per giorno su NomadLink.\n`];
  for (const day of days) {
    lines.push(`📅 ${day.title} (${day.date})`);
    if (day.blocks.length === 0) {
      lines.push('  · Da definire');
    } else {
      for (const block of day.blocks) {
        const title =
          typeof block.content.title === 'string' ? block.content.title : block.type;
        lines.push(`  · ${title}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}